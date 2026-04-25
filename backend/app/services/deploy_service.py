from __future__ import annotations

import json
import hashlib
import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import APIError
from app.core.security import encrypt_json
from app.db.models import (
    Assistant,
    AssistantStatus,
    DeploymentChannel,
    DeploymentChannelType,
    DeploymentLog,
    DeploymentStatus,
    IntegrationLogStatus,
    IntegrationStatus,
    IntegrationType,
    UsageEventType,
)
from app.repositories.assistants import AssistantRepository
from app.repositories.integrations import IntegrationsRepository
from app.schemas.deploy import DeployTelegramRequest, DeployWebhookRequest, DeployWebWidgetRequest
from app.services.limit_service import LimitService


class DeployService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.assistants = AssistantRepository(db)
        self.repo = IntegrationsRepository(db)
        self.settings = get_settings()

    def list_deployments(self, *, assistant_id: int, organization_id: int) -> list[DeploymentChannel]:
        self._get_assistant_in_org(assistant_id, organization_id)
        return self.repo.list_deployments(assistant_id)

    def get_deployment_in_org(self, *, deployment_id: int, organization_id: int) -> DeploymentChannel:
        deployment = self.repo.get_deployment_with_assistant(deployment_id)
        if deployment is None or deployment.assistant is None or deployment.assistant.organization_id != organization_id:
            raise APIError(status_code=404, error_code='deployment_not_found', message='Деплой не найден')
        return deployment

    def delete_deployment(self, deployment: DeploymentChannel) -> None:
        self.repo.delete_deployment(deployment)
        self.db.commit()

    def deploy_telegram(
        self,
        *,
        assistant_id: int,
        organization_id: int,
        payload: DeployTelegramRequest,
    ) -> DeploymentChannel:
        assistant = self._get_assistant_in_org(assistant_id, organization_id)
        LimitService(self.db).assert_allowed(organization_id, 'deployments', 1)
        self._upsert_telegram_integration(assistant.id, payload.bot_token)
        secret = secrets.token_urlsafe(24)
        webhook_url = str(payload.webhook_url) if payload.webhook_url else f'{self.settings.public_api_url}/api/v1/webhooks/telegram/{{deployment_id}}/{secret}'

        deployment = self._upsert_deployment(
            assistant_id=assistant.id,
            channel_type=DeploymentChannelType.telegram,
            status=DeploymentStatus.deployed,
            public_url=webhook_url,
            embed_code=None,
            config={
                'bot_token_masked': self._mask_token(payload.bot_token),
                'bot_token_encrypted_note': 'Токен хранится только в интеграции или внешнем секрет-хранилище',
                'webhook_url': webhook_url,
                'secret': secret,
            },
        )
        if '{deployment_id}' in webhook_url:
            deployment.public_url = webhook_url.replace('{deployment_id}', str(deployment.id))
            config = self.parse_config(deployment) or {}
            config['webhook_url'] = deployment.public_url
            deployment.config_json = json.dumps(config, ensure_ascii=False)
            self.db.commit()
            self.db.refresh(deployment)
        self._log(deployment, IntegrationLogStatus.success, 'deploy', 'Telegram webhook подготовлен')
        self._track_deploy_usage(assistant)
        return deployment

    def deploy_web_widget(
        self,
        *,
        assistant_id: int,
        organization_id: int,
        payload: DeployWebWidgetRequest,
    ) -> DeploymentChannel:
        assistant = self._get_assistant_in_org(assistant_id, organization_id)
        LimitService(self.db).assert_allowed(organization_id, 'deployments', 1)
        widget_id = f'w_{uuid.uuid4().hex[:12]}'
        domain = payload.domain.strip().lower()
        public_url = f'https://{domain}/widget/{widget_id}'
        embed_code = (
            '<script '
            f'data-assistant-id="{assistant.id}" data-widget-id="{widget_id}" '
            f'src="{self.settings.public_widget_url}"></script>'
        )

        deployment = self._upsert_deployment(
            assistant_id=assistant.id,
            channel_type=DeploymentChannelType.web_widget,
            status=DeploymentStatus.deployed,
            public_url=public_url,
            embed_code=embed_code,
            config={
                'widget_id': widget_id,
                'domain': domain,
                'welcome_text': payload.welcome_text,
            },
        )
        self._log(deployment, IntegrationLogStatus.success, 'deploy', 'Веб-виджет опубликован')
        self._track_deploy_usage(assistant)
        return deployment

    def deploy_webhook(
        self,
        *,
        assistant_id: int,
        organization_id: int,
        payload: DeployWebhookRequest,
    ) -> DeploymentChannel:
        assistant = self._get_assistant_in_org(assistant_id, organization_id)
        LimitService(self.db).assert_allowed(organization_id, 'deployments', 1)

        deployment = self._upsert_deployment(
            assistant_id=assistant.id,
            channel_type=DeploymentChannelType.webhook,
            status=DeploymentStatus.deployed,
            public_url=str(payload.target_url),
            embed_code=None,
            config={
                'target_url': str(payload.target_url),
                'secret_masked': self._mask_secret(payload.secret),
                'secret_hash': hashlib.sha256(payload.secret.encode('utf-8')).hexdigest() if payload.secret else None,
            },
        )
        self._log(deployment, IntegrationLogStatus.success, 'deploy', 'Webhook-канал опубликован')
        self._track_deploy_usage(assistant)
        return deployment

    def _upsert_deployment(
        self,
        *,
        assistant_id: int,
        channel_type: DeploymentChannelType,
        status: DeploymentStatus,
        public_url: str | None,
        embed_code: str | None,
        config: dict,
    ) -> DeploymentChannel:
        now = datetime.now(timezone.utc)
        deployment = self.repo.get_deployment_by_type(assistant_id, channel_type)

        if deployment is None:
            deployment = self.repo.create_deployment(
                assistant_id=assistant_id,
                channel_type=channel_type,
                status=status,
                public_url=public_url,
                embed_code=embed_code,
                config_json=json.dumps(config, ensure_ascii=False),
                deployed_at=now,
            )
        else:
            deployment.status = status
            deployment.public_url = public_url
            deployment.embed_code = embed_code
            deployment.config_json = json.dumps(config, ensure_ascii=False)
            deployment.deployed_at = now

        self.db.commit()
        self.db.refresh(deployment)
        return deployment

    def _track_deploy_usage(self, assistant: Assistant) -> None:
        self.repo.create_usage_event(
            organization_id=assistant.organization_id,
            assistant_id=assistant.id,
            conversation_id=None,
            type=UsageEventType.deploy,
            amount=1,
            unit='deploy',
            cost=0,
            metadata_json=json.dumps({'assistant_id': assistant.id}, ensure_ascii=False),
            created_at=datetime.now(timezone.utc),
        )
        self.db.commit()

    def _upsert_telegram_integration(self, assistant_id: int, bot_token: str) -> None:
        integration = self.repo.get_integration_by_type(assistant_id, IntegrationType.telegram)
        encrypted = encrypt_json({'bot_token': bot_token})
        if integration is None:
            self.repo.create_integration(
                assistant_id=assistant_id,
                type=IntegrationType.telegram,
                name='Telegram Bot',
                status=IntegrationStatus.connected,
                config_encrypted=encrypted,
                last_sync_at=datetime.now(timezone.utc),
            )
        else:
            integration.status = IntegrationStatus.connected
            integration.config_encrypted = encrypted
            integration.last_sync_at = datetime.now(timezone.utc)
        self.db.flush()

    def _get_assistant_in_org(self, assistant_id: int, organization_id: int) -> Assistant:
        assistant = self.assistants.get_in_org(assistant_id, organization_id)
        if assistant is None:
            raise APIError(status_code=404, error_code='assistant_not_found', message='Ассистент не найден')
        if assistant.status == AssistantStatus.archived:
            raise APIError(status_code=400, error_code='assistant_archived', message='Ассистент архивирован')
        return assistant

    @staticmethod
    def parse_config(deployment: DeploymentChannel) -> dict | None:
        if not deployment.config_json:
            return None
        try:
            parsed = json.loads(deployment.config_json)
        except Exception:
            return {'raw': deployment.config_json}
        if isinstance(parsed, dict):
            return parsed
        return {'value': parsed}

    @staticmethod
    def _mask_token(token: str) -> str:
        if len(token) <= 8:
            return '*' * len(token)
        return f'{token[:4]}***{token[-4:]}'

    @staticmethod
    def _mask_secret(secret: str | None) -> str | None:
        if not secret:
            return None
        if len(secret) <= 6:
            return '*' * len(secret)
        return f'{secret[:2]}***{secret[-2:]}'

    def _log(self, deployment: DeploymentChannel, status: IntegrationLogStatus, event: str, message: str, metadata: dict | None = None) -> None:
        self.db.add(
            DeploymentLog(
                deployment_id=deployment.id,
                assistant_id=deployment.assistant_id,
                channel_type=deployment.channel_type.value,
                status=status,
                event=event,
                message=message,
                metadata_json=json.dumps(metadata or {}, ensure_ascii=False),
            )
        )
        self.db.commit()

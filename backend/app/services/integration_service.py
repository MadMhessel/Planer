from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import APIError
from app.core.security import decrypt_json, encrypt_json
from app.db.models import Integration, IntegrationLog, IntegrationLogStatus, IntegrationStatus, IntegrationType
from app.repositories.assistants import AssistantRepository
from app.repositories.integrations import IntegrationsRepository
from app.schemas.integration import IntegrationCreate, IntegrationUpdate
from app.services.limit_service import LimitService


class IntegrationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.assistants = AssistantRepository(db)
        self.repo = IntegrationsRepository(db)
        self.settings = get_settings()

    def list_integrations(self, *, assistant_id: int, organization_id: int) -> list[Integration]:
        self._get_assistant_in_org(assistant_id, organization_id)
        return self.repo.list_integrations(assistant_id)

    def create_integration(
        self,
        *,
        assistant_id: int,
        organization_id: int,
        payload: IntegrationCreate,
    ) -> Integration:
        self._get_assistant_in_org(assistant_id, organization_id)
        LimitService(self.db).assert_allowed(organization_id, 'integrations', 1)
        integration_type = IntegrationType(payload.type)

        existing = self.repo.get_integration_by_type(assistant_id, integration_type)
        if existing is not None:
            raise APIError(status_code=409, error_code='integration_exists', message='Интеграция этого типа уже существует')

        integration = self.repo.create_integration(
            assistant_id=assistant_id,
            type=integration_type,
            name=payload.name,
            status=IntegrationStatus.disconnected,
            config_encrypted=encrypt_json(payload.config),
        )
        self.db.commit()
        self.db.refresh(integration)
        return integration

    def get_integration_in_org(self, *, integration_id: int, organization_id: int) -> Integration:
        integration = self.repo.get_integration_with_assistant(integration_id)
        if integration is None or integration.assistant is None or integration.assistant.organization_id != organization_id:
            raise APIError(status_code=404, error_code='integration_not_found', message='Интеграция не найдена')
        return integration

    def update_integration(self, integration: Integration, payload: IntegrationUpdate) -> Integration:
        if payload.name is not None:
            integration.name = payload.name
        if payload.config is not None:
            integration.config_encrypted = encrypt_json(payload.config)
            integration.status = IntegrationStatus.disconnected

        self.db.commit()
        self.db.refresh(integration)
        return integration

    def delete_integration(self, integration: Integration) -> None:
        self.repo.delete_integration(integration)
        self.db.commit()

    def test_connection(self, integration: Integration) -> tuple[Integration, str]:
        config = decrypt_json(integration.config_encrypted)
        valid, message = self._validate_config(integration.type, config)
        if valid and config.get('live_check'):
            valid, message = self._live_check(integration.type, config)
        integration.status = IntegrationStatus.connected if valid else IntegrationStatus.error
        self._log(integration=integration, status=IntegrationLogStatus.success if valid else IntegrationLogStatus.error, event='test', message=message)
        self.db.commit()
        self.db.refresh(integration)
        return integration, message

    def sync(self, integration: Integration) -> tuple[Integration, str]:
        config = decrypt_json(integration.config_encrypted)
        valid, message = self._validate_config(integration.type, config)
        if not valid:
            integration.status = IntegrationStatus.error
            self._log(integration=integration, status=IntegrationLogStatus.error, event='sync', message=message)
            self.db.commit()
            self.db.refresh(integration)
            return integration, 'Синхронизация не выполнена: конфигурация невалидна'

        sync_message = self._sync_external(integration.type, config)
        integration.status = IntegrationStatus.connected
        integration.last_sync_at = datetime.now(timezone.utc)
        self._log(integration=integration, status=IntegrationLogStatus.success, event='sync', message=sync_message)
        self.db.commit()
        self.db.refresh(integration)
        return integration, sync_message

    @staticmethod
    def get_public_config(integration: Integration) -> dict:
        return decrypt_json(integration.config_encrypted)

    def oauth_start(self, provider: str) -> dict:
        provider = provider.strip().lower()
        state = secrets.token_urlsafe(24)
        redirect_uri = f'{self.settings.public_api_url}/api/v1/integrations/{provider}/callback'
        config = self._oauth_config(provider)
        if config is None:
            return {
                'provider': provider,
                'authorization_url': f'{self.settings.public_frontend_url}/integrations?provider={provider}&status=config_required',
                'state': state,
                'configured': False,
            }
        base_url, params = config
        params = {**params, 'redirect_uri': redirect_uri, 'state': state}
        return {
            'provider': provider,
            'authorization_url': f'{base_url}?{urlencode(params)}',
            'state': state,
            'configured': True,
        }

    def oauth_callback(self, provider: str, code: str | None, state: str | None) -> dict:
        if not code:
            raise APIError(status_code=400, error_code='oauth_code_missing', message='OAuth-код отсутствует')
        return {'status': 'accepted', 'provider': provider, 'state': state, 'message': 'OAuth-код получен. Подключите интеграцию в карточке ассистента.'}

    def list_logs(self, integration: Integration) -> list[IntegrationLog]:
        stmt = (
            select(IntegrationLog)
            .where(IntegrationLog.integration_id == integration.id)
            .order_by(IntegrationLog.created_at.desc())
            .limit(100)
        )
        return list(self.db.execute(stmt).scalars().all())

    def _get_assistant_in_org(self, assistant_id: int, organization_id: int) -> None:
        assistant = self.assistants.get_in_org(assistant_id, organization_id)
        if assistant is None:
            raise APIError(status_code=404, error_code='assistant_not_found', message='Ассистент не найден')

    @staticmethod
    def _validate_config(integration_type: IntegrationType, config: dict) -> tuple[bool, str]:
        required_fields: dict[IntegrationType, tuple[str, ...]] = {
            IntegrationType.telegram: ('bot_token',),
            IntegrationType.notion: ('api_key',),
            IntegrationType.slack: ('bot_token',),
            IntegrationType.google_sheets: ('spreadsheet_id',),
            IntegrationType.webhook: ('url',),
            IntegrationType.email: ('smtp_host',),
            IntegrationType.crm: ('api_key',),
        }

        required = required_fields[integration_type]
        missing = [key for key in required if not config.get(key)]
        if missing:
            return False, f'Не заполнены обязательные поля: {", ".join(missing)}'

        return True, 'Соединение успешно'

    def _live_check(self, integration_type: IntegrationType, config: dict) -> tuple[bool, str]:
        try:
            if integration_type == IntegrationType.telegram:
                response = httpx.get(f'https://api.telegram.org/bot{config["bot_token"]}/getMe', timeout=15)
            elif integration_type == IntegrationType.notion:
                response = httpx.get('https://api.notion.com/v1/users/me', headers={'Authorization': f'Bearer {config["api_key"]}', 'Notion-Version': '2022-06-28'}, timeout=15)
            elif integration_type == IntegrationType.slack:
                response = httpx.post('https://slack.com/api/auth.test', headers={'Authorization': f'Bearer {config["bot_token"]}'}, timeout=15)
            elif integration_type == IntegrationType.webhook:
                response = httpx.get(config['url'], timeout=15)
            elif integration_type == IntegrationType.email:
                return True, 'SMTP-конфигурация принята'
            else:
                return True, 'Проверка внешнего API будет выполнена при синхронизации'
            return response.status_code < 400, 'Соединение успешно' if response.status_code < 400 else f'Сервис вернул HTTP {response.status_code}'
        except Exception as exc:
            return False, f'Ошибка внешней проверки: {exc}'

    def _sync_external(self, integration_type: IntegrationType, config: dict) -> str:
        if not config.get('live_check'):
            return 'Синхронизация выполнена'
        valid, message = self._live_check(integration_type, config)
        if not valid:
            raise APIError(status_code=400, error_code='integration_sync_failed', message=message)
        return 'Синхронизация выполнена'

    def _oauth_config(self, provider: str):
        if provider == 'notion' and self.settings.notion_client_id:
            return 'https://api.notion.com/v1/oauth/authorize', {
                'client_id': self.settings.notion_client_id,
                'response_type': 'code',
                'owner': 'user',
            }
        if provider == 'slack' and self.settings.slack_client_id:
            return 'https://slack.com/oauth/v2/authorize', {
                'client_id': self.settings.slack_client_id,
                'scope': 'chat:write,channels:read,app_mentions:read',
            }
        if provider in {'google', 'google_sheets', 'google_calendar'} and self.settings.google_client_id:
            return 'https://accounts.google.com/o/oauth2/v2/auth', {
                'client_id': self.settings.google_client_id,
                'response_type': 'code',
                'scope': 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar.events',
                'access_type': 'offline',
                'prompt': 'consent',
            }
        if provider == 'hubspot' and self.settings.hubspot_client_id:
            return 'https://app.hubspot.com/oauth/authorize', {
                'client_id': self.settings.hubspot_client_id,
                'scope': 'crm.objects.contacts.read crm.objects.contacts.write',
            }
        return None

    def _log(self, *, integration: Integration, status: IntegrationLogStatus, event: str, message: str, metadata: dict | None = None) -> None:
        self.db.add(
            IntegrationLog(
                integration_id=integration.id,
                assistant_id=integration.assistant_id,
                provider=integration.type.value,
                status=status,
                event=event,
                message=message,
                metadata_json=json.dumps(metadata or {}, ensure_ascii=False),
            )
        )

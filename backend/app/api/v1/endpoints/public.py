from __future__ import annotations

import hashlib

import httpx
from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.endpoints.chat import _chat_result_out
from app.core.errors import APIError
from app.core.security import decrypt_json
from app.db.models import DeploymentChannel, DeploymentChannelType, Integration, IntegrationType
from app.db.session import get_db
from app.repositories.integrations import IntegrationsRepository
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import ChatService
from app.services.deploy_service import DeployService

router = APIRouter(tags=['public-runtime'])


@router.get('/public/widget/{widget_id}/config')
def widget_config(widget_id: str, db: Session = Depends(get_db)) -> dict:
    deployment = _get_widget_deployment(db, widget_id)
    config = DeployService.parse_config(deployment) or {}
    assistant = deployment.assistant
    return {
        'widget_id': widget_id,
        'assistant_id': assistant.id,
        'assistant_name': assistant.name,
        'welcome_text': config.get('welcome_text') or assistant.welcome_message or 'Здравствуйте! Чем помочь?',
    }


@router.post('/public/widget/{widget_id}/chat', response_model=ChatResponse)
def widget_chat(widget_id: str, payload: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    deployment = _get_widget_deployment(db, widget_id)
    result = ChatService(db).chat(
        assistant_id=deployment.assistant_id,
        organization_id=deployment.assistant.organization_id,
        payload=payload,
    )
    return _chat_result_out(result)


@router.post('/webhooks/telegram/{deployment_id}/{secret}')
async def telegram_webhook(deployment_id: int, secret: str, request: Request, db: Session = Depends(get_db)) -> dict:
    deployment = IntegrationsRepository(db).get_deployment_with_assistant(deployment_id)
    if deployment is None or deployment.channel_type != DeploymentChannelType.telegram:
        raise APIError(status_code=404, error_code='deployment_not_found', message='Канал не найден')
    config = DeployService.parse_config(deployment) or {}
    if config.get('secret') != secret:
        raise APIError(status_code=401, error_code='invalid_webhook_secret', message='Некорректный секрет webhook')

    payload = await request.json()
    message = payload.get('message') or payload.get('edited_message') or {}
    text = message.get('text') or ''
    chat = message.get('chat') or {}
    chat_id = str(chat.get('id') or 'telegram-user')
    if not text:
        return {'status': 'ignored'}

    result = ChatService(db).chat(
        assistant_id=deployment.assistant_id,
        organization_id=deployment.assistant.organization_id,
        payload=ChatRequest(
            message=text,
            user_external_id=chat_id,
            channel_type='telegram',
            channel_conversation_id=chat_id,
        ),
    )
    answer = result.assistant_message.content
    bot_token = _telegram_bot_token(db, deployment.assistant_id)
    if bot_token:
        try:
            httpx.post(
                f'https://api.telegram.org/bot{bot_token}/sendMessage',
                json={'chat_id': chat_id, 'text': answer},
                timeout=20,
            )
        except Exception:
            pass
    return {'status': 'ok', 'answer': answer}


@router.post('/webhooks/generic/{deployment_id}')
async def generic_webhook(
    deployment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    x_webhook_secret: str | None = Header(default=None, alias='X-Webhook-Secret'),
) -> dict:
    deployment = IntegrationsRepository(db).get_deployment_with_assistant(deployment_id)
    if deployment is None or deployment.channel_type != DeploymentChannelType.webhook:
        raise APIError(status_code=404, error_code='deployment_not_found', message='Канал не найден')
    config = DeployService.parse_config(deployment) or {}
    expected_hash = config.get('secret_hash')
    if expected_hash:
        provided_hash = hashlib.sha256((x_webhook_secret or '').encode('utf-8')).hexdigest()
        if provided_hash != expected_hash:
            raise APIError(status_code=401, error_code='invalid_webhook_secret', message='Некорректный секрет webhook')
    payload = await request.json()
    text = str(payload.get('message') or payload.get('text') or '')
    if not text:
        raise APIError(status_code=400, error_code='message_missing', message='Сообщение отсутствует')
    result = ChatService(db).chat(
        assistant_id=deployment.assistant_id,
        organization_id=deployment.assistant.organization_id,
        payload=ChatRequest(
            message=text,
            user_external_id=str(payload.get('user_id') or 'webhook-user'),
            channel_type='api',
            channel_conversation_id=str(payload.get('conversation_id') or ''),
        ),
    )
    return {'status': 'ok', 'answer': result.assistant_message.content}


@router.post('/webhooks/slack/events')
async def slack_events(request: Request) -> dict:
    payload = await request.json()
    if payload.get('type') == 'url_verification':
        return {'challenge': payload.get('challenge')}
    return {'status': 'accepted'}


def _get_widget_deployment(db: Session, widget_id: str) -> DeploymentChannel:
    stmt = select(DeploymentChannel).where(
        DeploymentChannel.channel_type == DeploymentChannelType.web_widget,
        DeploymentChannel.config_json.contains(widget_id),
    )
    deployment = db.execute(stmt).scalars().first()
    if deployment is None or deployment.assistant is None:
        raise APIError(status_code=404, error_code='widget_not_found', message='Виджет не найден')
    return deployment


def _telegram_bot_token(db: Session, assistant_id: int) -> str | None:
    stmt = select(Integration).where(Integration.assistant_id == assistant_id, Integration.type == IntegrationType.telegram)
    integration = db.execute(stmt).scalars().first()
    if integration is None:
        return None
    try:
        config = decrypt_json(integration.config_encrypted)
    except Exception:
        return None
    token = config.get('bot_token')
    return token if isinstance(token, str) else None

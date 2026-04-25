from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import RequestContext, get_request_context, require_roles
from app.db.models import Integration, OrganizationMemberRole
from app.db.session import get_db
from app.schemas.integration import (
    IntegrationActionResult,
    IntegrationCreate,
    IntegrationLogOut,
    IntegrationOut,
    IntegrationUpdate,
    OAuthStartOut,
)
from app.services.integration_service import IntegrationService

router = APIRouter(tags=['integrations'])


def _integration_out(service: IntegrationService, integration: Integration) -> IntegrationOut:
    return IntegrationOut(
        id=integration.id,
        assistant_id=integration.assistant_id,
        type=integration.type.value,
        name=integration.name,
        status=integration.status.value,
        config=service.get_public_config(integration),
        last_sync_at=integration.last_sync_at,
        created_at=integration.created_at,
        updated_at=integration.updated_at,
    )


def _log_out(log) -> IntegrationLogOut:
    import json

    metadata = None
    if log.metadata_json:
        try:
            parsed = json.loads(log.metadata_json)
            metadata = parsed if isinstance(parsed, dict) else {'value': parsed}
        except Exception:
            metadata = {'raw': log.metadata_json}
    return IntegrationLogOut(
        id=log.id,
        integration_id=log.integration_id,
        assistant_id=log.assistant_id,
        provider=log.provider,
        status=log.status.value,
        event=log.event,
        message=log.message,
        metadata=metadata,
        created_at=log.created_at,
    )


@router.get('/assistants/{assistant_id}/integrations', response_model=list[IntegrationOut])
def list_integrations(
    assistant_id: int,
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> list[IntegrationOut]:
    service = IntegrationService(db)
    integrations = service.list_integrations(assistant_id=assistant_id, organization_id=context.organization.id)
    return [_integration_out(service, item) for item in integrations]


@router.post('/assistants/{assistant_id}/integrations', response_model=IntegrationOut)
def create_integration(
    assistant_id: int,
    payload: IntegrationCreate,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> IntegrationOut:
    service = IntegrationService(db)
    integration = service.create_integration(
        assistant_id=assistant_id,
        organization_id=context.organization.id,
        payload=payload,
    )
    return _integration_out(service, integration)


@router.patch('/integrations/{integration_id}', response_model=IntegrationOut)
def update_integration(
    integration_id: int,
    payload: IntegrationUpdate,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> IntegrationOut:
    service = IntegrationService(db)
    integration = service.get_integration_in_org(integration_id=integration_id, organization_id=context.organization.id)
    updated = service.update_integration(integration, payload)
    return _integration_out(service, updated)


@router.delete('/integrations/{integration_id}')
def delete_integration(
    integration_id: int,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> dict:
    service = IntegrationService(db)
    integration = service.get_integration_in_org(integration_id=integration_id, organization_id=context.organization.id)
    service.delete_integration(integration)
    return {'status': 'ok'}


@router.post('/integrations/{integration_id}/test', response_model=IntegrationActionResult)
def test_integration(
    integration_id: int,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> IntegrationActionResult:
    service = IntegrationService(db)
    integration = service.get_integration_in_org(integration_id=integration_id, organization_id=context.organization.id)
    checked, message = service.test_connection(integration)
    return IntegrationActionResult(id=checked.id, status=checked.status.value, message=message, last_sync_at=checked.last_sync_at)


@router.post('/integrations/{integration_id}/sync', response_model=IntegrationActionResult)
def sync_integration(
    integration_id: int,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> IntegrationActionResult:
    service = IntegrationService(db)
    integration = service.get_integration_in_org(integration_id=integration_id, organization_id=context.organization.id)
    synced, message = service.sync(integration)
    return IntegrationActionResult(id=synced.id, status=synced.status.value, message=message, last_sync_at=synced.last_sync_at)


@router.get('/integrations/{integration_id}/logs', response_model=list[IntegrationLogOut])
def integration_logs(
    integration_id: int,
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> list[IntegrationLogOut]:
    service = IntegrationService(db)
    integration = service.get_integration_in_org(integration_id=integration_id, organization_id=context.organization.id)
    return [_log_out(item) for item in service.list_logs(integration)]


@router.get('/integrations/{provider}/start', response_model=OAuthStartOut)
def oauth_start(provider: str, db: Session = Depends(get_db)) -> OAuthStartOut:
    return OAuthStartOut(**IntegrationService(db).oauth_start(provider))


@router.get('/integrations/{provider}/callback')
def oauth_callback(provider: str, code: str | None = None, state: str | None = None, db: Session = Depends(get_db)) -> dict:
    return IntegrationService(db).oauth_callback(provider, code, state)

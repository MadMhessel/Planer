from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import RequestContext, get_request_context, require_roles
from app.db.models import DeploymentChannel, OrganizationMemberRole
from app.db.session import get_db
from app.schemas.deploy import (
    DeployTelegramRequest,
    DeployWebhookRequest,
    DeployWebWidgetRequest,
    DeploymentChannelOut,
)
from app.services.deploy_service import DeployService

router = APIRouter(tags=['deploy'])


def _deployment_out(service: DeployService, deployment: DeploymentChannel) -> DeploymentChannelOut:
    return DeploymentChannelOut(
        id=deployment.id,
        assistant_id=deployment.assistant_id,
        channel_type=deployment.channel_type.value,
        status=deployment.status.value,
        public_url=deployment.public_url,
        embed_code=deployment.embed_code,
        config=service.parse_config(deployment),
        deployed_at=deployment.deployed_at,
        created_at=deployment.created_at,
        updated_at=deployment.updated_at,
    )


@router.get('/assistants/{assistant_id}/deployments', response_model=list[DeploymentChannelOut])
def list_deployments(
    assistant_id: int,
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> list[DeploymentChannelOut]:
    service = DeployService(db)
    deployments = service.list_deployments(assistant_id=assistant_id, organization_id=context.organization.id)
    return [_deployment_out(service, item) for item in deployments]


@router.post('/assistants/{assistant_id}/deploy/telegram', response_model=DeploymentChannelOut)
def deploy_telegram(
    assistant_id: int,
    payload: DeployTelegramRequest,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> DeploymentChannelOut:
    service = DeployService(db)
    deployment = service.deploy_telegram(assistant_id=assistant_id, organization_id=context.organization.id, payload=payload)
    return _deployment_out(service, deployment)


@router.post('/assistants/{assistant_id}/deploy/web-widget', response_model=DeploymentChannelOut)
def deploy_web_widget(
    assistant_id: int,
    payload: DeployWebWidgetRequest,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> DeploymentChannelOut:
    service = DeployService(db)
    deployment = service.deploy_web_widget(assistant_id=assistant_id, organization_id=context.organization.id, payload=payload)
    return _deployment_out(service, deployment)


@router.post('/assistants/{assistant_id}/deploy/webhook', response_model=DeploymentChannelOut)
def deploy_webhook(
    assistant_id: int,
    payload: DeployWebhookRequest,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> DeploymentChannelOut:
    service = DeployService(db)
    deployment = service.deploy_webhook(assistant_id=assistant_id, organization_id=context.organization.id, payload=payload)
    return _deployment_out(service, deployment)


@router.delete('/deployments/{deployment_id}')
def delete_deployment(
    deployment_id: int,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> dict:
    service = DeployService(db)
    deployment = service.get_deployment_in_org(deployment_id=deployment_id, organization_id=context.organization.id)
    service.delete_deployment(deployment)
    return {'status': 'ok'}

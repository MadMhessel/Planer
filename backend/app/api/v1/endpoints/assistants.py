from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import RequestContext, get_request_context, require_roles
from app.core.errors import APIError
from app.db.models import OrganizationMemberRole
from app.db.session import get_db
from app.repositories.assistants import AssistantRepository
from app.schemas.assistant import AssistantCreate, AssistantOut, AssistantUpdate
from app.services.assistant_service import AssistantService

router = APIRouter(prefix='/assistants', tags=['assistants'])


@router.get('', response_model=list[AssistantOut])
def list_assistants(
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> list[AssistantOut]:
    repo = AssistantRepository(db)
    assistants = repo.list(context.organization.id)
    return [AssistantOut.model_validate(assistant) for assistant in assistants]


@router.post('', response_model=AssistantOut)
def create_assistant(
    payload: AssistantCreate,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> AssistantOut:
    service = AssistantService(db)
    assistant = service.create(organization_id=context.organization.id, created_by=context.user.id, payload=payload)
    return AssistantOut.model_validate(assistant)


@router.get('/{assistant_id}', response_model=AssistantOut)
def get_assistant(
    assistant_id: int,
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> AssistantOut:
    repo = AssistantRepository(db)
    assistant = repo.get_in_org(assistant_id, context.organization.id)
    if assistant is None:
        raise APIError(status_code=404, error_code='assistant_not_found', message='Ассистент не найден')
    return AssistantOut.model_validate(assistant)


@router.patch('/{assistant_id}', response_model=AssistantOut)
def update_assistant(
    assistant_id: int,
    payload: AssistantUpdate,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> AssistantOut:
    repo = AssistantRepository(db)
    assistant = repo.get_in_org(assistant_id, context.organization.id)
    assistant = AssistantService.get_or_404(assistant)

    service = AssistantService(db)
    updated = service.update(assistant, payload)
    return AssistantOut.model_validate(updated)


@router.delete('/{assistant_id}')
def delete_assistant(
    assistant_id: int,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> dict:
    repo = AssistantRepository(db)
    assistant = repo.get_in_org(assistant_id, context.organization.id)
    assistant = AssistantService.get_or_404(assistant)

    repo.delete(assistant)
    db.commit()
    return {'status': 'ok'}


@router.post('/{assistant_id}/archive', response_model=AssistantOut)
def archive_assistant(
    assistant_id: int,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> AssistantOut:
    repo = AssistantRepository(db)
    assistant = repo.get_in_org(assistant_id, context.organization.id)
    assistant = AssistantService.get_or_404(assistant)

    service = AssistantService(db)
    archived = service.archive(assistant)
    return AssistantOut.model_validate(archived)


@router.post('/{assistant_id}/duplicate', response_model=AssistantOut)
def duplicate_assistant(
    assistant_id: int,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> AssistantOut:
    repo = AssistantRepository(db)
    assistant = repo.get_in_org(assistant_id, context.organization.id)
    assistant = AssistantService.get_or_404(assistant)

    service = AssistantService(db)
    duplicate = service.duplicate(assistant, actor_user_id=context.user.id)
    return AssistantOut.model_validate(duplicate)

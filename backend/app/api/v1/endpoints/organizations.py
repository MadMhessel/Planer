from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import RequestContext, get_request_context, require_roles
from app.core.errors import APIError
from app.db.models import OrganizationMemberRole
from app.db.session import get_db
from app.repositories.organizations import OrganizationRepository
from app.schemas.organization import (
    OrganizationMemberCreate,
    OrganizationMemberOut,
    OrganizationMemberUpdate,
    OrganizationOut,
    OrganizationUpdate,
)
from app.services.organization_service import OrganizationService

router = APIRouter(prefix='/organizations', tags=['organizations'])


@router.get('/current', response_model=OrganizationOut)
def get_current_organization(context: Annotated[RequestContext, Depends(get_request_context)]) -> OrganizationOut:
    return OrganizationOut.model_validate(context.organization)


@router.patch('/current', response_model=OrganizationOut)
def update_current_organization(
    payload: OrganizationUpdate,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin)),
    ],
    db: Session = Depends(get_db),
) -> OrganizationOut:
    repo = OrganizationRepository(db)
    organization = repo.update_name(context.organization.id, payload.name)
    if organization is None:
        raise APIError(status_code=404, error_code='organization_not_found', message='Организация не найдена')
    db.commit()
    db.refresh(organization)
    return OrganizationOut.model_validate(organization)


@router.get('/members', response_model=list[OrganizationMemberOut])
def list_members(context: Annotated[RequestContext, Depends(get_request_context)], db: Session = Depends(get_db)) -> list[OrganizationMemberOut]:
    repo = OrganizationRepository(db)
    members = repo.list_members(context.organization.id)
    return [
        OrganizationMemberOut(
            id=member.id,
            role=member.role.value,
            created_at=member.created_at,
            user={
                'id': member.user.id,
                'email': member.user.email,
                'full_name': member.user.full_name,
            },
        )
        for member in members
    ]


@router.post('/members', response_model=OrganizationMemberOut)
def add_member(
    payload: OrganizationMemberCreate,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin)),
    ],
    db: Session = Depends(get_db),
) -> OrganizationMemberOut:
    service = OrganizationService(db)
    member = service.add_member(organization_id=context.organization.id, payload=payload)
    db.refresh(member)
    return OrganizationMemberOut(
        id=member.id,
        role=member.role.value,
        created_at=member.created_at,
        user={
            'id': member.user.id,
            'email': member.user.email,
            'full_name': member.user.full_name,
        },
    )


@router.patch('/members/{member_id}', response_model=OrganizationMemberOut)
def update_member(
    member_id: int,
    payload: OrganizationMemberUpdate,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin)),
    ],
    db: Session = Depends(get_db),
) -> OrganizationMemberOut:
    repo = OrganizationRepository(db)
    member = repo.get_member_by_id(member_id)
    if member is None or member.organization_id != context.organization.id:
        raise APIError(status_code=404, error_code='member_not_found', message='Участник не найден')

    service = OrganizationService(db)
    updated = service.update_member_role(
        actor_role=context.member.role,
        member=member,
        new_role=OrganizationMemberRole(payload.role),
    )

    return OrganizationMemberOut(
        id=updated.id,
        role=updated.role.value,
        created_at=updated.created_at,
        user={
            'id': updated.user.id,
            'email': updated.user.email,
            'full_name': updated.user.full_name,
        },
    )


@router.delete('/members/{member_id}')
def delete_member(
    member_id: int,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin)),
    ],
    db: Session = Depends(get_db),
) -> dict:
    repo = OrganizationRepository(db)
    member = repo.get_member_by_id(member_id)
    if member is None or member.organization_id != context.organization.id:
        raise APIError(status_code=404, error_code='member_not_found', message='Участник не найден')

    if member.user_id == context.user.id:
        raise APIError(status_code=400, error_code='self_delete_forbidden', message='Нельзя удалить самого себя')

    service = OrganizationService(db)
    service.delete_member(actor_role=context.member.role, member=member)
    return {'status': 'ok'}

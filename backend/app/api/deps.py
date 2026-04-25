from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.errors import APIError
from app.core.security import decode_token
from app.db.models import Organization, OrganizationMember, OrganizationMemberRole, User
from app.db.session import get_db
from app.repositories.organizations import OrganizationMemberRepository
from app.repositories.users import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl='/api/v1/auth/login')


@dataclass
class RequestContext:
    user: User
    organization: Organization
    member: OrganizationMember


DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(db: DbSession, token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    payload = decode_token(token, 'access')
    user = UserRepository(db).get_by_id(payload.sub)
    if user is None or not user.is_active:
        raise APIError(status_code=401, error_code='unauthorized', message='Пользователь не авторизован')
    return user


def get_request_context(
    db: DbSession,
    user: Annotated[User, Depends(get_current_user)],
    x_organization_id: Annotated[int | None, Header(alias='X-Organization-Id')] = None,
) -> RequestContext:
    member_repo = OrganizationMemberRepository(db)

    member = None
    if x_organization_id is not None:
        member = member_repo.get_context_member(user_id=user.id, organization_id=x_organization_id)
    if member is None:
        member = member_repo.get_first_context_member(user.id)

    if member is None or member.organization is None:
        raise APIError(status_code=403, error_code='organization_access_denied', message='Доступ к организации запрещён')

    return RequestContext(user=user, organization=member.organization, member=member)


def require_roles(*roles: OrganizationMemberRole):
    def dependency(context: Annotated[RequestContext, Depends(get_request_context)]) -> RequestContext:
        if context.member.role not in roles:
            raise APIError(status_code=403, error_code='insufficient_permissions', message='Недостаточно прав для операции')
        return context

    return dependency

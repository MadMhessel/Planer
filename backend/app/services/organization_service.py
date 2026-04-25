from __future__ import annotations

import secrets

from sqlalchemy.orm import Session

from app.core.errors import APIError
from app.core.security import hash_password
from app.db.models import OrganizationMember, OrganizationMemberRole
from app.repositories.organizations import OrganizationRepository
from app.repositories.users import UserRepository
from app.schemas.organization import OrganizationMemberCreate


class OrganizationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.orgs = OrganizationRepository(db)
        self.users = UserRepository(db)

    def add_member(self, *, organization_id: int, payload: OrganizationMemberCreate) -> OrganizationMember:
        role = OrganizationMemberRole(payload.role)
        user = self.users.get_by_email(payload.email)

        if user is None:
            generated_password = secrets.token_urlsafe(12)
            user = self.users.create(
                email=payload.email,
                password_hash=hash_password(generated_password),
                full_name=payload.full_name or payload.email.split('@')[0],
                is_verified=False,
            )

        existing = self.orgs.find_member(organization_id=organization_id, user_id=user.id)
        if existing is not None:
            raise APIError(status_code=409, error_code='member_exists', message='Пользователь уже состоит в организации')

        member = self.orgs.add_member(organization_id=organization_id, user_id=user.id, role=role)
        self.db.commit()
        self.db.refresh(member)
        return member

    def update_member_role(self, *, actor_role: OrganizationMemberRole, member: OrganizationMember, new_role: OrganizationMemberRole) -> OrganizationMember:
        if member.role == OrganizationMemberRole.owner and actor_role != OrganizationMemberRole.owner:
            raise APIError(status_code=403, error_code='insufficient_permissions', message='Только владелец может менять роль владельца')

        if actor_role == OrganizationMemberRole.admin and new_role == OrganizationMemberRole.owner:
            raise APIError(status_code=403, error_code='insufficient_permissions', message='Администратор не может назначать владельца')

        updated = self.orgs.update_member_role(member, new_role)
        self.db.commit()
        self.db.refresh(updated)
        return updated

    def delete_member(self, *, actor_role: OrganizationMemberRole, member: OrganizationMember) -> None:
        if member.role == OrganizationMemberRole.owner:
            raise APIError(status_code=400, error_code='owner_delete_forbidden', message='Нельзя удалить владельца организации')

        if actor_role == OrganizationMemberRole.admin and member.role == OrganizationMemberRole.admin:
            raise APIError(status_code=403, error_code='insufficient_permissions', message='Администратор не может удалять администратора')

        self.orgs.delete_member(member)
        self.db.commit()

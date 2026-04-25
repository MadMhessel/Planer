from sqlalchemy import and_, select
from sqlalchemy.orm import Session, joinedload

from app.db.models import Organization, OrganizationMember, OrganizationMemberRole, User


class OrganizationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, *, name: str, slug: str, owner_user_id: int) -> Organization:
        org = Organization(name=name, slug=slug, owner_user_id=owner_user_id)
        self.db.add(org)
        self.db.flush()
        return org

    def get_by_slug(self, slug: str) -> Organization | None:
        return self.db.execute(select(Organization).where(Organization.slug == slug)).scalar_one_or_none()

    def get_by_id(self, organization_id: int) -> Organization | None:
        return self.db.get(Organization, organization_id)

    def update_name(self, organization_id: int, name: str) -> Organization | None:
        org = self.get_by_id(organization_id)
        if org is None:
            return None
        org.name = name
        self.db.flush()
        return org

    def add_member(self, *, organization_id: int, user_id: int, role: OrganizationMemberRole) -> OrganizationMember:
        member = OrganizationMember(organization_id=organization_id, user_id=user_id, role=role)
        self.db.add(member)
        self.db.flush()
        return member

    def get_member_by_id(self, member_id: int) -> OrganizationMember | None:
        stmt = select(OrganizationMember).options(joinedload(OrganizationMember.user)).where(OrganizationMember.id == member_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_members(self, organization_id: int) -> list[OrganizationMember]:
        stmt = (
            select(OrganizationMember)
            .options(joinedload(OrganizationMember.user))
            .where(OrganizationMember.organization_id == organization_id)
            .order_by(OrganizationMember.created_at.asc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def find_member(self, *, organization_id: int, user_id: int) -> OrganizationMember | None:
        stmt = select(OrganizationMember).where(
            and_(
                OrganizationMember.organization_id == organization_id,
                OrganizationMember.user_id == user_id,
            )
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_user_memberships(self, user_id: int) -> list[OrganizationMember]:
        stmt = (
            select(OrganizationMember)
            .options(joinedload(OrganizationMember.organization))
            .where(OrganizationMember.user_id == user_id)
            .order_by(OrganizationMember.created_at.asc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def delete_member(self, member: OrganizationMember) -> None:
        self.db.delete(member)

    def update_member_role(self, member: OrganizationMember, role: OrganizationMemberRole) -> OrganizationMember:
        member.role = role
        self.db.flush()
        return member


class OrganizationMemberRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_context_member(self, *, user_id: int, organization_id: int) -> OrganizationMember | None:
        stmt = (
            select(OrganizationMember)
            .options(joinedload(OrganizationMember.organization), joinedload(OrganizationMember.user))
            .where(
                and_(
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.organization_id == organization_id,
                )
            )
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_first_context_member(self, user_id: int) -> OrganizationMember | None:
        stmt = (
            select(OrganizationMember)
            .options(joinedload(OrganizationMember.organization), joinedload(OrganizationMember.user))
            .where(OrganizationMember.user_id == user_id)
            .order_by(OrganizationMember.created_at.asc())
        )
        return self.db.execute(stmt).scalars().first()

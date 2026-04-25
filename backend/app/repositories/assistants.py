from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.db.models import Assistant


class AssistantRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self, organization_id: int) -> list[Assistant]:
        stmt = select(Assistant).where(Assistant.organization_id == organization_id).order_by(Assistant.created_at.desc())
        return list(self.db.execute(stmt).scalars().all())

    def create(self, **data) -> Assistant:
        assistant = Assistant(**data)
        self.db.add(assistant)
        self.db.flush()
        return assistant

    def get_in_org(self, assistant_id: int, organization_id: int) -> Assistant | None:
        stmt = select(Assistant).where(and_(Assistant.id == assistant_id, Assistant.organization_id == organization_id))
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_slug(self, organization_id: int, slug: str) -> Assistant | None:
        stmt = select(Assistant).where(and_(Assistant.organization_id == organization_id, Assistant.slug == slug))
        return self.db.execute(stmt).scalar_one_or_none()

    def delete(self, assistant: Assistant) -> None:
        self.db.delete(assistant)

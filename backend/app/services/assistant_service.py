from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.errors import APIError
from app.core.text import slugify
from app.db.models import Assistant, AssistantStatus
from app.repositories.assistants import AssistantRepository
from app.schemas.assistant import AssistantCreate, AssistantUpdate
from app.services.limit_service import LimitService


class AssistantService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = AssistantRepository(db)

    def create(self, *, organization_id: int, created_by: int, payload: AssistantCreate) -> Assistant:
        LimitService(self.db).assert_allowed(organization_id, 'assistants', 1)
        slug = self._make_unique_slug(organization_id, payload.name)
        assistant = self.repo.create(
            organization_id=organization_id,
            name=payload.name,
            slug=slug,
            description=payload.description,
            status=AssistantStatus.draft,
            system_prompt=payload.system_prompt,
            welcome_message=payload.welcome_message,
            model_provider=payload.model_provider,
            model_name=payload.model_name,
            temperature=payload.temperature,
            max_tokens=payload.max_tokens,
            memory_enabled=payload.memory_enabled,
            is_public=payload.is_public,
            created_by=created_by,
        )
        self.db.commit()
        self.db.refresh(assistant)
        return assistant

    def update(self, assistant: Assistant, payload: AssistantUpdate) -> Assistant:
        data = payload.model_dump(exclude_unset=True)
        if 'name' in data and data['name']:
            assistant.slug = self._make_unique_slug(assistant.organization_id, data['name'], current_id=assistant.id)
        for key, value in data.items():
            setattr(assistant, key, value)

        self.db.commit()
        self.db.refresh(assistant)
        return assistant

    def archive(self, assistant: Assistant) -> Assistant:
        assistant.status = AssistantStatus.archived
        self.db.commit()
        self.db.refresh(assistant)
        return assistant

    def duplicate(self, assistant: Assistant, *, actor_user_id: int) -> Assistant:
        copied_name = f'{assistant.name} (копия)'
        copied_slug = self._make_unique_slug(assistant.organization_id, copied_name)

        duplicate = self.repo.create(
            organization_id=assistant.organization_id,
            name=copied_name,
            slug=copied_slug,
            description=assistant.description,
            avatar_url=assistant.avatar_url,
            status=AssistantStatus.draft,
            system_prompt=assistant.system_prompt,
            welcome_message=assistant.welcome_message,
            model_provider=assistant.model_provider,
            model_name=assistant.model_name,
            temperature=float(assistant.temperature) if assistant.temperature is not None else None,
            max_tokens=assistant.max_tokens,
            memory_enabled=assistant.memory_enabled,
            is_public=False,
            created_by=actor_user_id,
        )
        self.db.commit()
        self.db.refresh(duplicate)
        return duplicate

    def _make_unique_slug(self, organization_id: int, name: str, current_id: int | None = None) -> str:
        base = slugify(name)
        slug = base
        counter = 2

        while True:
            existing = self.repo.get_by_slug(organization_id, slug)
            if existing is None or existing.id == current_id:
                return slug
            slug = f'{base}-{counter}'
            counter += 1

    @staticmethod
    def get_or_404(assistant: Assistant | None) -> Assistant:
        if assistant is None:
            raise APIError(status_code=404, error_code='assistant_not_found', message='Ассистент не найден')
        return assistant

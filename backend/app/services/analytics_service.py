from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.core.errors import APIError
from app.db.models import Assistant, Conversation, Message, MessageRole, UsageEvent
from app.repositories.assistants import AssistantRepository
from app.schemas.analytics import (
    AnalyticsOverviewOut,
    ConversationAnalyticsOut,
    FailedConversationOut,
    IntentOut,
    MessageVolumePoint,
)


class AnalyticsService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.assistants = AssistantRepository(db)

    def overview(self, *, assistant_id: int, organization_id: int) -> AnalyticsOverviewOut:
        self._get_assistant(assistant_id, organization_id)
        now = datetime.now(timezone.utc)
        month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

        conversations_count = self.db.execute(
            select(func.count(Conversation.id)).where(Conversation.assistant_id == assistant_id)
        ).scalar_one()
        avg_latency = self.db.execute(
            select(func.avg(Message.latency_ms))
            .join(Conversation, Conversation.id == Message.conversation_id)
            .where(
                Conversation.assistant_id == assistant_id,
                Message.role == MessageRole.assistant,
                Message.latency_ms.is_not(None),
            )
        ).scalar_one()
        messages_this_month = self.db.execute(
            select(func.count(Message.id))
            .join(Conversation, Conversation.id == Message.conversation_id)
            .where(Conversation.assistant_id == assistant_id, Message.created_at >= month_start)
        ).scalar_one()
        total_tokens = self.db.execute(
            select(func.coalesce(func.sum(UsageEvent.amount), 0)).where(UsageEvent.assistant_id == assistant_id)
        ).scalar_one()

        return AnalyticsOverviewOut(
            total_conversations=int(conversations_count),
            avg_response_time_ms=self._maybe_float(avg_latency),
            messages_this_month=int(messages_this_month),
            satisfaction=None,
            total_tokens=self._float(total_tokens),
        )

    def message_volume(self, *, assistant_id: int, organization_id: int) -> list[MessageVolumePoint]:
        self._get_assistant(assistant_id, organization_id)
        messages = self._messages_for_assistant(assistant_id)
        grouped: dict[str, int] = defaultdict(int)
        for message in messages:
            grouped[message.created_at.date().isoformat()] += 1
        return [MessageVolumePoint(date=date, messages=count) for date, count in sorted(grouped.items())]

    def intents(self, *, assistant_id: int, organization_id: int) -> list[IntentOut]:
        self._get_assistant(assistant_id, organization_id)
        messages = [item.content.lower() for item in self._messages_for_assistant(assistant_id) if item.role == MessageRole.user]
        counter: Counter[str] = Counter()

        for content in messages:
            if any(keyword in content for keyword in ['договор', 'nda', 'штраф', 'ответственность', 'юрид']):
                counter['Юридические вопросы'] += 1
            elif any(keyword in content for keyword in ['цена', 'тариф', 'оплат', 'счёт', 'счет']):
                counter['Оплата и тарифы'] += 1
            elif any(keyword in content for keyword in ['интеграц', 'telegram', 'webhook', 'slack']):
                counter['Интеграции'] += 1
            else:
                counter['Общие вопросы'] += 1

        total = sum(counter.values())
        if total == 0:
            return []

        return [
            IntentOut(name=name, count=count, share=round(count / total * 100, 2))
            for name, count in counter.most_common()
        ]

    def conversations(self, *, assistant_id: int, organization_id: int) -> list[ConversationAnalyticsOut]:
        self._get_assistant(assistant_id, organization_id)
        stmt = (
            select(Conversation, func.count(Message.id))
            .outerjoin(Message, Message.conversation_id == Conversation.id)
            .where(Conversation.assistant_id == assistant_id)
            .group_by(Conversation.id)
            .order_by(Conversation.last_message_at.desc())
        )
        rows = self.db.execute(stmt).all()
        return [
            ConversationAnalyticsOut(
                id=conversation.id,
                user_external_id=conversation.user_external_id,
                channel_type=conversation.channel_type.value,
                status=conversation.status.value,
                messages_count=int(messages_count),
                last_message_at=conversation.last_message_at,
            )
            for conversation, messages_count in rows
        ]

    def failed(self, *, assistant_id: int, organization_id: int) -> list[FailedConversationOut]:
        self._get_assistant(assistant_id, organization_id)
        stmt = (
            select(Conversation)
            .where(
                and_(
                    Conversation.assistant_id == assistant_id,
                    ~Conversation.messages.any(Message.role == MessageRole.assistant),
                )
            )
            .order_by(Conversation.last_message_at.desc())
        )
        conversations = self.db.execute(stmt).scalars().all()
        return [
            FailedConversationOut(
                conversation_id=conversation.id,
                reason='Нет ответа ассистента',
                last_message_at=conversation.last_message_at,
            )
            for conversation in conversations
        ]

    def _messages_for_assistant(self, assistant_id: int) -> list[Message]:
        stmt = (
            select(Message)
            .join(Conversation, Conversation.id == Message.conversation_id)
            .where(Conversation.assistant_id == assistant_id)
            .order_by(Message.created_at.asc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def _get_assistant(self, assistant_id: int, organization_id: int) -> Assistant:
        assistant = self.assistants.get_in_org(assistant_id, organization_id)
        if assistant is None:
            raise APIError(status_code=404, error_code='assistant_not_found', message='Ассистент не найден')
        return assistant

    @staticmethod
    def _maybe_float(value) -> float | None:
        if value is None:
            return None
        return float(value)

    @staticmethod
    def _float(value) -> float:
        if isinstance(value, Decimal):
            return float(value)
        return float(value or 0)

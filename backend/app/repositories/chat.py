from __future__ import annotations

from datetime import datetime

from sqlalchemy import and_, delete, select
from sqlalchemy.orm import Session, joinedload

from app.db.models import (
    ChannelType,
    Conversation,
    ConversationStatus,
    DocumentChunk,
    DocumentIndexingStatus,
    DocumentParseStatus,
    KnowledgeBase,
    KnowledgeDocument,
    Message,
    MessageRole,
    UsageEvent,
    UsageEventType,
)


class ChatRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_conversation_with_assistant(self, conversation_id: int) -> Conversation | None:
        stmt = (
            select(Conversation)
            .options(joinedload(Conversation.assistant))
            .where(Conversation.id == conversation_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def find_active_conversation(
        self,
        *,
        assistant_id: int,
        user_external_id: str,
        channel_type: ChannelType,
        channel_conversation_id: str | None,
    ) -> Conversation | None:
        conditions = [
            Conversation.assistant_id == assistant_id,
            Conversation.user_external_id == user_external_id,
            Conversation.channel_type == channel_type,
            Conversation.status == ConversationStatus.active,
        ]
        if channel_conversation_id is None:
            conditions.append(Conversation.channel_conversation_id.is_(None))
        else:
            conditions.append(Conversation.channel_conversation_id == channel_conversation_id)

        stmt = (
            select(Conversation)
            .where(and_(*conditions))
            .order_by(Conversation.last_message_at.desc())
        )
        return self.db.execute(stmt).scalars().first()

    def create_conversation(
        self,
        *,
        assistant_id: int,
        user_external_id: str,
        channel_type: ChannelType,
        channel_conversation_id: str | None,
        started_at: datetime,
    ) -> Conversation:
        conversation = Conversation(
            assistant_id=assistant_id,
            user_external_id=user_external_id,
            channel_type=channel_type,
            channel_conversation_id=channel_conversation_id,
            started_at=started_at,
            last_message_at=started_at,
            status=ConversationStatus.active,
        )
        self.db.add(conversation)
        self.db.flush()
        return conversation

    def list_conversations(self, assistant_id: int, *, limit: int = 50) -> list[Conversation]:
        stmt = (
            select(Conversation)
            .where(Conversation.assistant_id == assistant_id)
            .order_by(Conversation.last_message_at.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())

    def set_conversation_status(self, conversation: Conversation, status: ConversationStatus) -> Conversation:
        conversation.status = status
        self.db.flush()
        return conversation

    def create_message(
        self,
        *,
        conversation_id: int,
        role: MessageRole,
        content: str,
        token_input: int | None = None,
        token_output: int | None = None,
        model_used: str | None = None,
        latency_ms: int | None = None,
        metadata_json: str | None = None,
        created_at: datetime,
    ) -> Message:
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            token_input=token_input,
            token_output=token_output,
            model_used=model_used,
            latency_ms=latency_ms,
            metadata_json=metadata_json,
            created_at=created_at,
        )
        self.db.add(message)
        self.db.flush()
        return message

    def list_messages(self, conversation_id: int, *, limit: int = 200) -> list[Message]:
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_latest_user_message(self, conversation_id: int) -> Message | None:
        stmt = (
            select(Message)
            .where(and_(Message.conversation_id == conversation_id, Message.role == MessageRole.user))
            .order_by(Message.created_at.desc())
        )
        return self.db.execute(stmt).scalars().first()

    def get_latest_assistant_message(self, conversation_id: int) -> Message | None:
        stmt = (
            select(Message)
            .where(and_(Message.conversation_id == conversation_id, Message.role == MessageRole.assistant))
            .order_by(Message.created_at.desc())
        )
        return self.db.execute(stmt).scalars().first()

    def touch_conversation(self, conversation: Conversation, when: datetime) -> None:
        conversation.last_message_at = when
        self.db.flush()

    def create_usage_event(
        self,
        *,
        organization_id: int,
        assistant_id: int,
        conversation_id: int,
        event_type: UsageEventType,
        amount: float,
        unit: str,
        cost: float,
        metadata_json: str | None,
        created_at: datetime,
    ) -> UsageEvent:
        event = UsageEvent(
            organization_id=organization_id,
            assistant_id=assistant_id,
            conversation_id=conversation_id,
            type=event_type,
            amount=amount,
            unit=unit,
            cost=cost,
            metadata_json=metadata_json,
            created_at=created_at,
        )
        self.db.add(event)
        self.db.flush()
        return event

    def search_chunks_for_assistant(self, assistant_id: int, *, limit: int = 400) -> list[tuple[int, int, str]]:
        stmt = (
            select(DocumentChunk.id, DocumentChunk.document_id, DocumentChunk.content)
            .join(KnowledgeDocument, KnowledgeDocument.id == DocumentChunk.document_id)
            .join(KnowledgeBase, KnowledgeBase.id == KnowledgeDocument.knowledge_base_id)
            .where(
                and_(
                    KnowledgeBase.assistant_id == assistant_id,
                    KnowledgeDocument.parse_status == DocumentParseStatus.ready,
                    KnowledgeDocument.indexing_status == DocumentIndexingStatus.ready,
                )
            )
            .limit(limit)
        )
        return list(self.db.execute(stmt).all())

    def delete_messages(self, message_ids: list[int]) -> None:
        if not message_ids:
            return
        self.db.execute(delete(Message).where(Message.id.in_(message_ids)))
        self.db.flush()

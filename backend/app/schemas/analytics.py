from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AnalyticsOverviewOut(BaseModel):
    total_conversations: int
    avg_response_time_ms: float | None
    messages_this_month: int
    satisfaction: float | None
    total_tokens: float


class MessageVolumePoint(BaseModel):
    date: str
    messages: int


class IntentOut(BaseModel):
    name: str
    count: int
    share: float


class ConversationAnalyticsOut(BaseModel):
    id: int
    user_external_id: str
    channel_type: str
    status: str
    messages_count: int
    last_message_at: datetime


class FailedConversationOut(BaseModel):
    conversation_id: int
    reason: str
    last_message_at: datetime

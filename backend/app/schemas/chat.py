from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

ChannelTypeLiteral = Literal['web', 'telegram', 'whatsapp', 'slack', 'email', 'api']
ConversationStatusLiteral = Literal['active', 'closed']
MessageRoleLiteral = Literal['system', 'user', 'assistant', 'tool']


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=5000)
    conversation_id: int | None = None
    user_external_id: str = Field(default='web-user', min_length=1, max_length=255)
    channel_type: ChannelTypeLiteral = 'web'
    channel_conversation_id: str | None = Field(default=None, max_length=255)


class RetrievedChunkOut(BaseModel):
    chunk_id: int
    document_id: int
    score: float
    snippet: str


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    role: MessageRoleLiteral
    content: str
    token_input: int | None
    token_output: int | None
    model_used: str | None
    latency_ms: int | None
    metadata: dict[str, Any] | None
    created_at: datetime


class ConversationOut(BaseModel):
    id: int
    assistant_id: int
    user_external_id: str
    channel_type: ChannelTypeLiteral
    channel_conversation_id: str | None
    status: ConversationStatusLiteral
    started_at: datetime
    last_message_at: datetime


class ChatResponse(BaseModel):
    conversation: ConversationOut
    assistant_message: MessageOut
    retrieved_chunks: list[RetrievedChunkOut]

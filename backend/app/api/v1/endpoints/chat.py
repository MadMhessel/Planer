from __future__ import annotations

import json
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import RequestContext, get_request_context, require_roles
from app.db.models import Conversation, Message, OrganizationMemberRole
from app.db.session import get_db
from app.schemas.chat import ChatRequest, ChatResponse, ConversationOut, MessageOut, RetrievedChunkOut
from app.services.chat_service import ChatResult, ChatService

router = APIRouter(tags=['chat'])


def _safe_metadata(value: str | None) -> dict[str, Any] | None:
    if not value:
        return None
    try:
        parsed = json.loads(value)
    except Exception:
        return {'raw': value}
    if isinstance(parsed, dict):
        return parsed
    return {'value': parsed}


def _conversation_out(conversation: Conversation) -> ConversationOut:
    return ConversationOut(
        id=conversation.id,
        assistant_id=conversation.assistant_id,
        user_external_id=conversation.user_external_id,
        channel_type=conversation.channel_type.value,
        channel_conversation_id=conversation.channel_conversation_id,
        status=conversation.status.value,
        started_at=conversation.started_at,
        last_message_at=conversation.last_message_at,
    )


def _message_out(message: Message) -> MessageOut:
    return MessageOut(
        id=message.id,
        conversation_id=message.conversation_id,
        role=message.role.value,
        content=message.content,
        token_input=message.token_input,
        token_output=message.token_output,
        model_used=message.model_used,
        latency_ms=message.latency_ms,
        metadata=_safe_metadata(message.metadata_json),
        created_at=message.created_at,
    )


def _chat_result_out(result: ChatResult) -> ChatResponse:
    return ChatResponse(
        conversation=_conversation_out(result.conversation),
        assistant_message=_message_out(result.assistant_message),
        retrieved_chunks=[
            RetrievedChunkOut(
                chunk_id=item.chunk_id,
                document_id=item.document_id,
                score=item.score,
                snippet=item.snippet,
            )
            for item in result.retrieved_chunks
        ],
    )


@router.post('/assistants/{assistant_id}/chat', response_model=ChatResponse)
def chat_with_assistant(
    assistant_id: int,
    payload: ChatRequest,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> ChatResponse:
    service = ChatService(db)
    result = service.chat(assistant_id=assistant_id, organization_id=context.organization.id, payload=payload)
    return _chat_result_out(result)


@router.get('/assistants/{assistant_id}/conversations', response_model=list[ConversationOut])
def list_conversations(
    assistant_id: int,
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> list[ConversationOut]:
    service = ChatService(db)
    conversations = service.list_conversations(assistant_id=assistant_id, organization_id=context.organization.id)
    return [_conversation_out(item) for item in conversations]


@router.get('/conversations/{conversation_id}/messages', response_model=list[MessageOut])
def list_conversation_messages(
    conversation_id: int,
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> list[MessageOut]:
    service = ChatService(db)
    messages = service.list_messages(conversation_id=conversation_id, organization_id=context.organization.id)
    return [_message_out(item) for item in messages]


@router.post('/conversations/{conversation_id}/retry', response_model=ChatResponse)
def retry_conversation(
    conversation_id: int,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> ChatResponse:
    service = ChatService(db)
    result = service.retry(conversation_id=conversation_id, organization_id=context.organization.id)
    return _chat_result_out(result)


@router.post('/conversations/{conversation_id}/close', response_model=ConversationOut)
def close_conversation(
    conversation_id: int,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> ConversationOut:
    service = ChatService(db)
    conversation = service.close_conversation(conversation_id=conversation_id, organization_id=context.organization.id)
    return _conversation_out(conversation)

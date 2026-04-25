from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from time import perf_counter

from sqlalchemy.orm import Session

from app.adapters.openai_adapter import OpenAIAdapter
from app.adapters.qdrant_adapter import QdrantAdapter
from app.core.errors import APIError
from app.db.models import (
    Assistant,
    AssistantStatus,
    ChannelType,
    Conversation,
    ConversationStatus,
    Message,
    MessageRole,
    UsageEventType,
)
from app.repositories.assistants import AssistantRepository
from app.repositories.chat import ChatRepository
from app.schemas.chat import ChatRequest
from app.services.limit_service import LimitService


@dataclass
class RetrievedChunk:
    chunk_id: int
    document_id: int
    score: float
    snippet: str


@dataclass
class ChatResult:
    conversation: Conversation
    assistant_message: Message
    retrieved_chunks: list[RetrievedChunk]


class ChatService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.assistants = AssistantRepository(db)
        self.repo = ChatRepository(db)

    def chat(self, *, assistant_id: int, organization_id: int, payload: ChatRequest) -> ChatResult:
        started = perf_counter()
        now = datetime.now(timezone.utc)

        assistant = self._get_assistant_in_org(assistant_id, organization_id)
        LimitService(self.db).assert_allowed(organization_id, 'messages', 1)
        conversation = self._resolve_conversation(assistant_id=assistant.id, organization_id=organization_id, payload=payload, now=now)

        user_tokens = self._estimate_tokens(payload.message)
        self.repo.create_message(
            conversation_id=conversation.id,
            role=MessageRole.user,
            content=payload.message,
            token_input=user_tokens,
            created_at=now,
        )

        retrieved_chunks = self._retrieve_chunks(assistant.id, payload.message, organization_id=organization_id)
        answer_text, model_used, output_tokens, latency_ms, llm_meta = self._generate_answer(
            assistant=assistant,
            user_message=payload.message,
            retrieved_chunks=retrieved_chunks,
            started=started,
        )
        LimitService(self.db).assert_allowed(organization_id, 'tokens', user_tokens + output_tokens)

        assistant_message = self.repo.create_message(
            conversation_id=conversation.id,
            role=MessageRole.assistant,
            content=answer_text,
            token_input=user_tokens,
            token_output=output_tokens,
            model_used=model_used,
            latency_ms=latency_ms,
            metadata_json=json.dumps(
                {
                    **llm_meta,
                    'retrieved_chunks': [
                        {
                            'chunk_id': item.chunk_id,
                            'document_id': item.document_id,
                            'score': item.score,
                        }
                        for item in retrieved_chunks
                    ]
                },
                ensure_ascii=False,
            ),
            created_at=now,
        )

        self.repo.touch_conversation(conversation, now)
        self.repo.create_usage_event(
            organization_id=organization_id,
            assistant_id=assistant.id,
            conversation_id=conversation.id,
            event_type=UsageEventType.message,
            amount=float(user_tokens + output_tokens),
            unit='tokens',
            cost=0,
            metadata_json=json.dumps({'action': 'chat'}, ensure_ascii=False),
            created_at=now,
        )

        self.db.commit()
        self.db.refresh(conversation)
        self.db.refresh(assistant_message)

        return ChatResult(conversation=conversation, assistant_message=assistant_message, retrieved_chunks=retrieved_chunks)

    def retry(self, *, conversation_id: int, organization_id: int) -> ChatResult:
        started = perf_counter()
        now = datetime.now(timezone.utc)

        conversation = self._get_conversation_in_org(conversation_id, organization_id)
        if conversation.status == ConversationStatus.closed:
            raise APIError(status_code=400, error_code='conversation_closed', message='Диалог уже закрыт')

        last_user_message = self.repo.get_latest_user_message(conversation.id)
        if last_user_message is None:
            raise APIError(status_code=400, error_code='no_user_message', message='Нет пользовательского сообщения для повтора')

        previous_assistant_message = self.repo.get_latest_assistant_message(conversation.id)
        retrieved_chunks = self._retrieve_chunks(conversation.assistant_id, last_user_message.content, organization_id=organization_id)
        answer_text, model_used, output_tokens, latency_ms, llm_meta = self._generate_answer(
            assistant=conversation.assistant,
            user_message=last_user_message.content,
            retrieved_chunks=retrieved_chunks,
            retry=True,
            started=started,
        )
        LimitService(self.db).assert_allowed(organization_id, 'tokens', output_tokens)

        metadata = {
            **llm_meta,
            'retried': True,
            'retried_from_message_id': previous_assistant_message.id if previous_assistant_message else None,
            'retrieved_chunks': [
                {
                    'chunk_id': item.chunk_id,
                    'document_id': item.document_id,
                    'score': item.score,
                }
                for item in retrieved_chunks
            ],
        }

        assistant_message = self.repo.create_message(
            conversation_id=conversation.id,
            role=MessageRole.assistant,
            content=answer_text,
            token_input=last_user_message.token_input,
            token_output=output_tokens,
            model_used=model_used,
            latency_ms=latency_ms,
            metadata_json=json.dumps(metadata, ensure_ascii=False),
            created_at=now,
        )

        self.repo.touch_conversation(conversation, now)
        self.repo.create_usage_event(
            organization_id=organization_id,
            assistant_id=conversation.assistant_id,
            conversation_id=conversation.id,
            event_type=UsageEventType.message,
            amount=float(output_tokens),
            unit='tokens',
            cost=0,
            metadata_json=json.dumps({'action': 'retry'}, ensure_ascii=False),
            created_at=now,
        )

        self.db.commit()
        self.db.refresh(conversation)
        self.db.refresh(assistant_message)

        return ChatResult(conversation=conversation, assistant_message=assistant_message, retrieved_chunks=retrieved_chunks)

    def list_conversations(self, *, assistant_id: int, organization_id: int) -> list[Conversation]:
        self._get_assistant_in_org(assistant_id, organization_id)
        return self.repo.list_conversations(assistant_id)

    def list_messages(self, *, conversation_id: int, organization_id: int) -> list[Message]:
        conversation = self._get_conversation_in_org(conversation_id, organization_id)
        return self.repo.list_messages(conversation.id)

    def close_conversation(self, *, conversation_id: int, organization_id: int) -> Conversation:
        conversation = self._get_conversation_in_org(conversation_id, organization_id)
        self.repo.set_conversation_status(conversation, ConversationStatus.closed)
        self.db.commit()
        self.db.refresh(conversation)
        return conversation

    def _resolve_conversation(
        self,
        *,
        assistant_id: int,
        organization_id: int,
        payload: ChatRequest,
        now: datetime,
    ) -> Conversation:
        if payload.conversation_id is not None:
            conversation = self._get_conversation_in_org(payload.conversation_id, organization_id)
            if conversation.assistant_id != assistant_id:
                raise APIError(status_code=400, error_code='assistant_mismatch', message='Диалог не принадлежит ассистенту')
            if conversation.status == ConversationStatus.closed:
                raise APIError(status_code=400, error_code='conversation_closed', message='Диалог закрыт')
            return conversation

        existing = self.repo.find_active_conversation(
            assistant_id=assistant_id,
            user_external_id=payload.user_external_id,
            channel_type=ChannelType(payload.channel_type),
            channel_conversation_id=payload.channel_conversation_id,
        )
        if existing is not None:
            return existing

        return self.repo.create_conversation(
            assistant_id=assistant_id,
            user_external_id=payload.user_external_id,
            channel_type=ChannelType(payload.channel_type),
            channel_conversation_id=payload.channel_conversation_id,
            started_at=now,
        )

    def _retrieve_chunks(self, assistant_id: int, question: str, *, organization_id: int, top_k: int = 3) -> list[RetrievedChunk]:
        vector_hits = self._retrieve_qdrant_chunks(assistant_id=assistant_id, organization_id=organization_id, question=question, top_k=top_k)
        if vector_hits:
            return vector_hits

        raw_chunks = self.repo.search_chunks_for_assistant(assistant_id)
        if not raw_chunks:
            return []

        keywords = self._keywords(question)
        scored: list[RetrievedChunk] = []

        for chunk_id, document_id, content in raw_chunks:
            normalized = content.lower()
            score = sum(1 for keyword in keywords if keyword in normalized)
            if score <= 0 and keywords:
                continue

            snippet = content.strip().replace('\n', ' ')
            if len(snippet) > 280:
                snippet = f'{snippet[:277]}...'

            scored.append(
                RetrievedChunk(
                    chunk_id=chunk_id,
                    document_id=document_id,
                    score=score,
                    snippet=snippet,
                )
            )

        if not scored:
            fallback = raw_chunks[:top_k]
            return [
                RetrievedChunk(
                    chunk_id=item[0],
                    document_id=item[1],
                    score=0,
                    snippet=item[2][:280].replace('\n', ' ').strip(),
                )
                for item in fallback
            ]

        scored.sort(key=lambda item: (item.score, len(item.snippet)), reverse=True)
        return scored[:top_k]

    def _generate_answer(
        self,
        *,
        assistant: Assistant,
        user_message: str,
        retrieved_chunks: list[RetrievedChunk],
        retry: bool = False,
        started: float | None = None,
    ) -> tuple[str, str, int, int, dict]:
        prefix = 'Повторный ответ: ' if retry else ''
        openai = OpenAIAdapter()
        if openai.enabled:
            try:
                result = openai.create_response(
                    system_prompt=assistant.system_prompt or '',
                    user_message=user_message,
                    context_chunks=[item.snippet for item in retrieved_chunks],
                    model=assistant.model_name,
                    temperature=float(assistant.temperature) if assistant.temperature is not None else None,
                    max_tokens=assistant.max_tokens,
                )
                if result is not None:
                    return (
                        f'{prefix}{result.text}',
                        result.model,
                        result.output_tokens or self._estimate_tokens(result.text),
                        result.latency_ms,
                        {'provider': 'openai', 'input_tokens': result.input_tokens},
                    )
            except Exception as exc:
                llm_error = str(exc)
            else:
                llm_error = None
        else:
            llm_error = None

        if retrieved_chunks:
            references = '\n'.join([f'- {item.snippet}' for item in retrieved_chunks])
            text = (
                f'{prefix}На основе базы знаний нашёл релевантные данные:\n'
                f'{references}\n\n'
                'Если нужно, могу сузить ответ под ваш конкретный кейс.'
            )
            return self._fallback_result(text, assistant, started, llm_error)

        if assistant.welcome_message:
            return self._fallback_result(f'{prefix}{assistant.welcome_message}\n\nУточните вопрос, и я помогу детальнее.', assistant, started, llm_error)

        if assistant.system_prompt:
            prompt_preview = assistant.system_prompt.strip().replace('\n', ' ')
            if len(prompt_preview) > 180:
                prompt_preview = f'{prompt_preview[:177]}...'
            text = (
                f'{prefix}Я обработал ваш запрос: "{user_message}".\n'
                f'Текущий системный контекст: {prompt_preview}'
            )
            return self._fallback_result(text, assistant, started, llm_error)

        text = f'{prefix}Я получил ваш запрос: "{user_message}". Уточните детали, чтобы я дал точный ответ.'
        return self._fallback_result(text, assistant, started, llm_error)

    def _retrieve_qdrant_chunks(self, *, assistant_id: int, organization_id: int, question: str, top_k: int) -> list[RetrievedChunk]:
        openai = OpenAIAdapter()
        if not openai.enabled:
            return []
        try:
            embedding = openai.create_embedding(question)
            if not embedding:
                return []
            hits = QdrantAdapter().search(vector=embedding, organization_id=organization_id, assistant_id=assistant_id, limit=top_k)
        except Exception:
            return []

        result: list[RetrievedChunk] = []
        for hit in hits:
            payload = hit.get('payload') or {}
            content = str(payload.get('content') or '').strip()
            if not content:
                continue
            result.append(
                RetrievedChunk(
                    chunk_id=int(payload.get('chunk_id') or 0),
                    document_id=int(payload.get('document_id') or 0),
                    score=float(hit.get('score') or 0),
                    snippet=content[:280].replace('\n', ' '),
                )
            )
        return result

    def _fallback_result(self, text: str, assistant: Assistant, started: float | None, llm_error: str | None) -> tuple[str, str, int, int, dict]:
        latency_ms = int((perf_counter() - started) * 1000) if started is not None else None
        metadata = {'provider': 'fallback'}
        if llm_error:
            metadata['llm_error'] = llm_error[:500]
        return (
            text,
            assistant.model_name or 'mvp-chat-runtime',
            self._estimate_tokens(text),
            latency_ms or 0,
            metadata,
        )

    def _get_assistant_in_org(self, assistant_id: int, organization_id: int) -> Assistant:
        assistant = self.assistants.get_in_org(assistant_id, organization_id)
        if assistant is None:
            raise APIError(status_code=404, error_code='assistant_not_found', message='Ассистент не найден')
        if assistant.status == AssistantStatus.archived:
            raise APIError(status_code=400, error_code='assistant_archived', message='Ассистент архивирован')
        return assistant

    def _get_conversation_in_org(self, conversation_id: int, organization_id: int) -> Conversation:
        conversation = self.repo.get_conversation_with_assistant(conversation_id)
        if conversation is None or conversation.assistant is None or conversation.assistant.organization_id != organization_id:
            raise APIError(status_code=404, error_code='conversation_not_found', message='Диалог не найден')
        return conversation

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        text = text.strip()
        if not text:
            return 0
        return max(1, int(len(text) / 4))

    @staticmethod
    def _keywords(text: str) -> list[str]:
        values = re.findall(r'[a-zA-Zа-яА-ЯёЁ0-9]{3,}', text.lower())
        return list(dict.fromkeys(values))[:24]

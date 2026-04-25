from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter
from typing import Any

import httpx

from app.core.config import get_settings


@dataclass
class LLMResult:
    text: str
    model: str
    input_tokens: int
    output_tokens: int
    latency_ms: int
    raw: dict[str, Any] | None = None


class OpenAIAdapter:
    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def enabled(self) -> bool:
        return bool(self.settings.openai_api_key)

    def create_embedding(self, text: str) -> list[float] | None:
        if not self.enabled:
            return None

        response = httpx.post(
            'https://api.openai.com/v1/embeddings',
            headers=self._headers(),
            json={
                'model': self.settings.openai_embedding_model,
                'input': text,
            },
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
        data = payload.get('data') or []
        if not data:
            return None
        embedding = data[0].get('embedding')
        return embedding if isinstance(embedding, list) else None

    def create_response(
        self,
        *,
        system_prompt: str,
        user_message: str,
        context_chunks: list[str],
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResult | None:
        if not self.enabled:
            return None

        started = perf_counter()
        context = '\n\n'.join(context_chunks)
        instructions = system_prompt.strip() or 'Ты полезный ИИ-ассистент. Отвечай на русском языке.'
        if context:
            instructions = (
                f'{instructions}\n\n'
                'Используй контекст из базы знаний. Если контекста недостаточно, прямо скажи об этом.\n\n'
                f'Контекст:\n{context}'
            )

        response = httpx.post(
            'https://api.openai.com/v1/responses',
            headers=self._headers(),
            json={
                'model': model or self.settings.openai_chat_model,
                'instructions': instructions,
                'input': user_message,
                'temperature': temperature if temperature is not None else self.settings.openai_temperature,
                'max_output_tokens': max_tokens or self.settings.openai_max_tokens,
            },
            timeout=90,
        )
        response.raise_for_status()
        payload = response.json()
        text = self._extract_output_text(payload)
        usage = payload.get('usage') or {}
        return LLMResult(
            text=text or 'Не удалось сформировать ответ.',
            model=payload.get('model') or model or self.settings.openai_chat_model,
            input_tokens=int(usage.get('input_tokens') or 0),
            output_tokens=int(usage.get('output_tokens') or 0),
            latency_ms=int((perf_counter() - started) * 1000),
            raw=payload,
        )

    def _headers(self) -> dict[str, str]:
        return {
            'Authorization': f'Bearer {self.settings.openai_api_key}',
            'Content-Type': 'application/json',
        }

    @staticmethod
    def _extract_output_text(payload: dict[str, Any]) -> str:
        direct = payload.get('output_text')
        if isinstance(direct, str) and direct.strip():
            return direct.strip()

        parts: list[str] = []
        for item in payload.get('output') or []:
            for content in item.get('content') or []:
                text = content.get('text')
                if isinstance(text, str):
                    parts.append(text)
        return '\n'.join(parts).strip()

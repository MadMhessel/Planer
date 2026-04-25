from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings


class QdrantAdapter:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.collection = self.settings.qdrant_collection
        self.base_url = self.settings.qdrant_url.rstrip('/')

    def ensure_collection(self, vector_size: int) -> None:
        if vector_size <= 0:
            return
        payload = {
            'vectors': {
                'size': vector_size,
                'distance': 'Cosine',
            }
        }
        response = httpx.put(f'{self.base_url}/collections/{self.collection}', json=payload, timeout=20)
        if response.status_code not in {200, 201}:
            response.raise_for_status()

    def upsert_chunk(
        self,
        *,
        point_id: int,
        vector: list[float],
        organization_id: int,
        assistant_id: int,
        document_id: int,
        chunk_id: int,
        content: str,
    ) -> None:
        if not vector:
            return
        self.ensure_collection(len(vector))
        payload = {
            'points': [
                {
                    'id': point_id,
                    'vector': vector,
                    'payload': {
                        'organization_id': organization_id,
                        'assistant_id': assistant_id,
                        'document_id': document_id,
                        'chunk_id': chunk_id,
                        'content': content,
                    },
                }
            ]
        }
        response = httpx.put(f'{self.base_url}/collections/{self.collection}/points', json=payload, timeout=30)
        response.raise_for_status()

    def search(
        self,
        *,
        vector: list[float],
        organization_id: int,
        assistant_id: int,
        limit: int = 4,
    ) -> list[dict[str, Any]]:
        if not vector:
            return []
        payload = {
            'vector': vector,
            'limit': limit,
            'with_payload': True,
            'filter': {
                'must': [
                    {'key': 'organization_id', 'match': {'value': organization_id}},
                    {'key': 'assistant_id', 'match': {'value': assistant_id}},
                ]
            },
        }
        response = httpx.post(f'{self.base_url}/collections/{self.collection}/points/search', json=payload, timeout=30)
        response.raise_for_status()
        result = response.json().get('result') or []
        return result if isinstance(result, list) else []

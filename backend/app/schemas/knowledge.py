from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl

KnowledgeBaseStatusLiteral = Literal['draft', 'processing', 'ready', 'failed', 'archived']
DocumentSourceTypeLiteral = Literal['upload', 'url', 'text', 'manual']
DocumentParseStatusLiteral = Literal['pending', 'processing', 'ready', 'failed']
DocumentIndexingStatusLiteral = Literal['pending', 'processing', 'ready', 'failed']


class KnowledgeBaseCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    chunk_size: int = Field(default=500, ge=100, le=4000)
    chunk_overlap: int = Field(default=50, ge=0, le=1000)


class KnowledgeBaseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    status: KnowledgeBaseStatusLiteral | None = None
    chunk_size: int | None = Field(default=None, ge=100, le=4000)
    chunk_overlap: int | None = Field(default=None, ge=0, le=1000)


class KnowledgeBaseOut(BaseModel):
    id: int
    assistant_id: int
    name: str
    description: str | None
    status: KnowledgeBaseStatusLiteral
    chunk_size: int
    chunk_overlap: int
    created_at: datetime
    updated_at: datetime

    model_config = {'from_attributes': True}


class KnowledgeDocumentOut(BaseModel):
    id: int
    knowledge_base_id: int
    filename: str
    original_url: str | None
    storage_key: str | None
    mime_type: str | None
    file_size: int | None
    source_type: DocumentSourceTypeLiteral
    parse_status: DocumentParseStatusLiteral
    indexing_status: DocumentIndexingStatusLiteral
    chunks_count: int
    created_at: datetime
    updated_at: datetime


class DocumentFromUrlRequest(BaseModel):
    url: HttpUrl
    filename: str | None = Field(default=None, max_length=255)


class ReindexDocumentRequest(BaseModel):
    chunk_size: int | None = Field(default=None, ge=100, le=4000)
    chunk_overlap: int | None = Field(default=None, ge=0, le=1000)

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

IntegrationTypeLiteral = Literal['telegram', 'notion', 'slack', 'google_sheets', 'webhook', 'email', 'crm']
IntegrationStatusLiteral = Literal['connected', 'disconnected', 'error']


class IntegrationCreate(BaseModel):
    type: IntegrationTypeLiteral
    name: str = Field(min_length=2, max_length=255)
    config: dict[str, Any] = Field(default_factory=dict)


class IntegrationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    config: dict[str, Any] | None = None


class IntegrationOut(BaseModel):
    id: int
    assistant_id: int
    type: IntegrationTypeLiteral
    name: str
    status: IntegrationStatusLiteral
    config: dict[str, Any]
    last_sync_at: datetime | None
    created_at: datetime
    updated_at: datetime


class IntegrationActionResult(BaseModel):
    id: int
    status: IntegrationStatusLiteral
    message: str
    last_sync_at: datetime | None


class OAuthStartOut(BaseModel):
    provider: str
    authorization_url: str
    state: str
    configured: bool


class IntegrationLogOut(BaseModel):
    id: int
    integration_id: int | None
    assistant_id: int | None
    provider: str
    status: str
    event: str
    message: str
    metadata: dict[str, Any] | None
    created_at: datetime

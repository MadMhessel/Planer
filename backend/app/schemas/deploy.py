from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, HttpUrl

DeploymentChannelTypeLiteral = Literal['telegram', 'web_widget', 'webhook']
DeploymentStatusLiteral = Literal['deployed', 'inactive', 'failed']


class DeployTelegramRequest(BaseModel):
    bot_token: str = Field(min_length=10, max_length=300)
    webhook_url: HttpUrl | None = None


class DeployWebWidgetRequest(BaseModel):
    domain: str = Field(min_length=3, max_length=255)
    welcome_text: str | None = Field(default=None, max_length=500)


class DeployWebhookRequest(BaseModel):
    target_url: HttpUrl
    secret: str | None = Field(default=None, max_length=255)


class DeploymentChannelOut(BaseModel):
    id: int
    assistant_id: int
    channel_type: DeploymentChannelTypeLiteral
    status: DeploymentStatusLiteral
    public_url: str | None
    embed_code: str | None
    config: dict[str, Any] | None
    deployed_at: datetime | None
    created_at: datetime
    updated_at: datetime

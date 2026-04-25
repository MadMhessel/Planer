from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

AssistantStatusLiteral = Literal['draft', 'active', 'archived']


class AssistantCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    system_prompt: str | None = None
    welcome_message: str | None = None
    model_provider: str | None = Field(default=None, max_length=64)
    model_name: str | None = Field(default=None, max_length=128)
    temperature: float | None = Field(default=None, ge=0, le=2)
    max_tokens: int | None = Field(default=None, ge=1, le=32768)
    memory_enabled: bool = False
    is_public: bool = False


class AssistantUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    status: AssistantStatusLiteral | None = None
    system_prompt: str | None = None
    welcome_message: str | None = None
    model_provider: str | None = Field(default=None, max_length=64)
    model_name: str | None = Field(default=None, max_length=128)
    temperature: float | None = Field(default=None, ge=0, le=2)
    max_tokens: int | None = Field(default=None, ge=1, le=32768)
    memory_enabled: bool | None = None
    is_public: bool | None = None


class AssistantOut(BaseModel):
    id: int
    organization_id: int
    name: str
    slug: str
    description: str | None
    status: AssistantStatusLiteral
    system_prompt: str | None
    welcome_message: str | None
    model_provider: str | None
    model_name: str | None
    temperature: float | None
    max_tokens: int | None
    memory_enabled: bool
    is_public: bool
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {'from_attributes': True}

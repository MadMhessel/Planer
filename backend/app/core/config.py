from functools import lru_cache

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', case_sensitive=False)

    app_name: str = 'AI Assistants Backend'
    api_prefix: str = '/api/v1'
    debug: bool = False

    postgres_server: str = 'localhost'
    postgres_port: int = 5432
    postgres_user: str = 'ai_backend'
    postgres_password: str = 'ai_backend'
    postgres_db: str = 'ai_backend'
    database_url: str | None = None

    redis_url: str = 'redis://localhost:6379/0'
    storage_root: str = 'storage'
    integration_secret_key: str = 'change-integration-secret'
    queue_names: str = 'default,documents,integrations,deploy'
    process_documents_async: bool = False
    enforce_billing_limits: bool = False

    public_api_url: str = 'http://localhost:8000'
    public_frontend_url: str = 'http://localhost:5173'
    public_widget_url: str = 'http://localhost:5173/widget.js'

    s3_endpoint_url: str | None = None
    s3_bucket_name: str = 'ai-assistants'
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    s3_region: str = 'auto'

    qdrant_url: str = 'http://localhost:6333'
    qdrant_collection: str = 'assistant_chunks'
    sentry_dsn: str | None = None

    openai_api_key: str | None = None
    openai_chat_model: str = 'gpt-4.1-mini'
    openai_embedding_model: str = 'text-embedding-3-small'
    openai_max_tokens: int = 900
    openai_temperature: float = 0.3

    yookassa_shop_id: str | None = None
    yookassa_secret_key: str | None = None
    yookassa_webhook_secret: str | None = None

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str = 'noreply@testpromo.lab.denis-dev.ru'
    smtp_from_name: str = 'AI Ассистенты'
    smtp_use_tls: bool = True

    notion_client_id: str | None = None
    notion_client_secret: str | None = None
    slack_client_id: str | None = None
    slack_client_secret: str | None = None
    google_client_id: str | None = None
    google_client_secret: str | None = None
    hubspot_client_id: str | None = None
    hubspot_client_secret: str | None = None

    jwt_secret_key: str = 'change-this-in-production'
    jwt_algorithm: str = 'HS256'
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    cors_origins: str = 'http://localhost:5173,http://127.0.0.1:5173'

    @computed_field
    @property
    def sqlalchemy_database_uri(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f'postgresql+psycopg://{self.postgres_user}:{self.postgres_password}'
            f'@{self.postgres_server}:{self.postgres_port}/{self.postgres_db}'
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(',') if origin.strip()]

    @property
    def queue_name_list(self) -> list[str]:
        return [name.strip() for name in self.queue_names.split(',') if name.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

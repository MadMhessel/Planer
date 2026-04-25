# AI Assistants Backend (Commercial v1)

Backend для SaaS-платформы создания ИИ-ассистентов.

## Что реализовано

- FastAPI API с версионированием `/api/v1`.
- Auth: регистрация, логин, refresh, logout, `me`, email verification, forgot/reset password.
- JWT access tokens + refresh token в httpOnly cookie, при этом bearer-flow сохранён для dev/tests.
- Organizations: текущая организация + участники.
- Assistants: CRUD, duplicate, archive, сохранение system prompt и параметров модели.
- Knowledge Base: upload, URL import, parsing PDF/DOCX/TXT/HTML, chunking, sync/async indexing через RQ.
- Storage: локальный fallback + S3-compatible adapter для MinIO.
- RAG: chunks в PostgreSQL, embeddings через OpenAI, vector search через Qdrant при наличии ключей.
- Chat runtime: OpenAI Responses API при наличии `OPENAI_API_KEY`, fallback runtime для dev/test, usage tracking.
- Integrations: Telegram, Notion, Slack, Google Sheets/Calendar, HubSpot, webhook, email; OAuth start/callback; encrypted config; logs.
- Deploy: Telegram webhook, web-widget, generic webhook, deployment logs, public runtime endpoints.
- Billing: тарифы, manual subscribe, ЮKassa checkout, ЮKassa webhook, saved payment methods, renew job, invoices.
- Limits: hard-limit enforcement по тарифам через `ENFORCE_BILLING_LIMITS=true`.
- Analytics: overview, messages, intents, conversations, failed conversations.
- Admin/Ops: organization-scoped overview.
- Production compose: API, worker, PostgreSQL, Redis, Qdrant, MinIO, Nginx, static frontend.

## Локальный запуск

```bash
cd backend
cp .env.example .env
make install
make up
source .venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Без Docker/PostgreSQL можно поднять smoke на SQLite:

```bash
cd backend
source .venv/bin/activate
DATABASE_URL=sqlite:////tmp/aiassist-dev.db STORAGE_ROOT=/tmp/aiassist-storage alembic upgrade head
DATABASE_URL=sqlite:////tmp/aiassist-dev.db STORAGE_ROOT=/tmp/aiassist-storage uvicorn app.main:app --reload --port 8000
```

Frontend dev server проксирует `/api` на backend:

```bash
cd ..
npm run dev -- --host 0.0.0.0
```

## Production

```bash
cd backend
cp .env.production.example .env.production
# заполнить реальные secrets
make prod-up
make prod-migrate
make prod-logs
make prod-backup
```

Nginx в `docker-compose.prod.yml` отдаёт `../dist` как SPA и проксирует `/api`, `/docs`, `/openapi.json` в backend.

Для HTTPS нужно поставить TLS-терминацию на VPS: Caddy/Traefik перед compose либо внешний reverse proxy.

## Ключевые endpoints

- `/api/v1/auth/*`
- `/api/v1/organizations/*`
- `/api/v1/assistants/*`
- `/api/v1/knowledge-bases/*`
- `/api/v1/documents/*`
- `/api/v1/assistants/{id}/chat`
- `/api/v1/integrations/{id}/test`
- `/api/v1/integrations/{id}/sync`
- `/api/v1/integrations/{id}/logs`
- `/api/v1/integrations/{provider}/start`
- `/api/v1/integrations/{provider}/callback`
- `/api/v1/assistants/{id}/deploy/telegram`
- `/api/v1/assistants/{id}/deploy/web-widget`
- `/api/v1/assistants/{id}/deploy/webhook`
- `/api/v1/public/widget/{widget_id}/config`
- `/api/v1/public/widget/{widget_id}/chat`
- `/api/v1/webhooks/telegram/{deployment_id}/{secret}`
- `/api/v1/webhooks/generic/{deployment_id}`
- `/api/v1/webhooks/slack/events`
- `/api/v1/billing/checkout`
- `/api/v1/billing/webhooks/yookassa`
- `/api/v1/billing/renew`
- `/api/v1/billing/limits`
- `/api/v1/billing/usage/current`
- `/api/v1/assistants/{id}/analytics/*`
- `/api/v1/admin/overview`

## Важные env

- Core: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET_KEY`, `CORS_ORIGINS`, `PUBLIC_API_URL`, `PUBLIC_FRONTEND_URL`, `PUBLIC_WIDGET_URL`.
- AI: `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`, `OPENAI_EMBEDDING_MODEL`, `OPENAI_MAX_TOKENS`, `OPENAI_TEMPERATURE`.
- Vector DB: `QDRANT_URL`, `QDRANT_COLLECTION`.
- Storage: `S3_ENDPOINT_URL`, `S3_BUCKET_NAME`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
- Billing: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `YOOKASSA_WEBHOOK_SECRET`.
- Mail: `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`.
- Ops: `SENTRY_DSN`, `PROCESS_DOCUMENTS_ASYNC`, `ENFORCE_BILLING_LIMITS`.

## Тесты

```bash
cd backend
source .venv/bin/activate
pytest -q
```

Покрыто: auth, assistants, knowledge, chat/RAG fallback, integrations/deploy, billing/analytics/admin, commercial checkout/webhook/widget flow.

## Ограничения

- Реальные OpenAI/Qdrant/MinIO/ЮKassa/SMTP/OAuth вызовы требуют production-секретов.
- Если `OPENAI_API_KEY` не задан, используется fallback-ответ, чтобы dev/test были автономными.
- Если `PROCESS_DOCUMENTS_ASYNC=false`, документы индексируются синхронно.
- Для боевого запуска нужно настроить DNS/TLS, webhook URLs в ЮKassa/Telegram/Slack, мониторинг и регулярный restore backup.

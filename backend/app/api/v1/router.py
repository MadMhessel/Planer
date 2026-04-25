from fastapi import APIRouter

from app.api.v1.endpoints import admin, analytics, assistants, auth, billing, chat, deploy, health, integrations, knowledge, organizations, public

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(billing.router)
api_router.include_router(organizations.router)
api_router.include_router(assistants.router)
api_router.include_router(knowledge.router)
api_router.include_router(chat.router)
api_router.include_router(integrations.router)
api_router.include_router(deploy.router)
api_router.include_router(analytics.router)
api_router.include_router(admin.router)
api_router.include_router(public.router)

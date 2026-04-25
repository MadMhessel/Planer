from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import RequestContext, get_request_context
from app.db.session import get_db
from app.schemas.analytics import AnalyticsOverviewOut, ConversationAnalyticsOut, FailedConversationOut, IntentOut, MessageVolumePoint
from app.services.analytics_service import AnalyticsService

router = APIRouter(tags=['analytics'])


@router.get('/assistants/{assistant_id}/analytics/overview', response_model=AnalyticsOverviewOut)
def analytics_overview(
    assistant_id: int,
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> AnalyticsOverviewOut:
    return AnalyticsService(db).overview(assistant_id=assistant_id, organization_id=context.organization.id)


@router.get('/assistants/{assistant_id}/analytics/messages', response_model=list[MessageVolumePoint])
def analytics_messages(
    assistant_id: int,
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> list[MessageVolumePoint]:
    return AnalyticsService(db).message_volume(assistant_id=assistant_id, organization_id=context.organization.id)


@router.get('/assistants/{assistant_id}/analytics/intents', response_model=list[IntentOut])
def analytics_intents(
    assistant_id: int,
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> list[IntentOut]:
    return AnalyticsService(db).intents(assistant_id=assistant_id, organization_id=context.organization.id)


@router.get('/assistants/{assistant_id}/analytics/conversations', response_model=list[ConversationAnalyticsOut])
def analytics_conversations(
    assistant_id: int,
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> list[ConversationAnalyticsOut]:
    return AnalyticsService(db).conversations(assistant_id=assistant_id, organization_id=context.organization.id)


@router.get('/assistants/{assistant_id}/analytics/failed', response_model=list[FailedConversationOut])
def analytics_failed(
    assistant_id: int,
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> list[FailedConversationOut]:
    return AnalyticsService(db).failed(assistant_id=assistant_id, organization_id=context.organization.id)

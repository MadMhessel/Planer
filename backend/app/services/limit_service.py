from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import APIError
from app.db.models import Assistant, Integration, KnowledgeDocument, Plan, UsageEvent, UsageEventType
from app.repositories.billing import BillingRepository


class LimitService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()
        self.billing = BillingRepository(db)

    def assert_allowed(self, organization_id: int, metric: str, increment: float = 1) -> None:
        if not self.settings.enforce_billing_limits:
            return

        limits = self.limits(organization_id)
        limit = limits.get(metric)
        if limit is None:
            return

        current = self.current_usage(organization_id).get(metric, 0)
        if current + increment > float(limit):
            raise APIError(
                status_code=402,
                error_code='limit_exceeded',
                message='Превышен лимит тарифа. Обновите тариф или уменьшите использование.',
                details={'metric': metric, 'limit': limit, 'current': current, 'increment': increment},
            )

    def limits(self, organization_id: int) -> dict:
        subscription = self.billing.get_current_subscription(organization_id)
        plan = subscription.plan if subscription is not None else self._fallback_plan()
        if plan is None:
            return {}
        try:
            limits = json.loads(plan.limits_json or '{}')
        except Exception:
            return {}
        return limits if isinstance(limits, dict) else {}

    def current_usage(self, organization_id: int) -> dict[str, float]:
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        assistants = self.db.execute(
            select(func.count(Assistant.id)).where(Assistant.organization_id == organization_id)
        ).scalar_one()
        integrations = self.db.execute(
            select(func.count(Integration.id)).join(Assistant).where(Assistant.organization_id == organization_id)
        ).scalar_one()
        storage_bytes = self.db.execute(
            select(func.coalesce(func.sum(KnowledgeDocument.file_size), 0))
            .join(KnowledgeDocument.knowledge_base)
            .join(Assistant)
            .where(Assistant.organization_id == organization_id)
        ).scalar_one()
        message_tokens = self.db.execute(
            select(func.coalesce(func.sum(UsageEvent.amount), 0)).where(
                UsageEvent.organization_id == organization_id,
                UsageEvent.type == UsageEventType.message,
                UsageEvent.created_at >= month_start,
            )
        ).scalar_one()
        message_events = self.db.execute(
            select(func.count(UsageEvent.id)).where(
                UsageEvent.organization_id == organization_id,
                UsageEvent.type == UsageEventType.message,
                UsageEvent.created_at >= month_start,
            )
        ).scalar_one()
        return {
            'assistants': float(assistants or 0),
            'integrations': float(integrations or 0),
            'storage_mb': round(float(storage_bytes or 0) / 1024 / 1024, 2),
            'tokens': float(message_tokens or 0),
            'messages': float(message_events or 0),
        }

    def _fallback_plan(self) -> Plan | None:
        return self.billing.get_plan_by_code('starter')

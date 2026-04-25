from __future__ import annotations

from sqlalchemy import and_, select
from sqlalchemy.orm import Session, joinedload

from app.db.models import Invoice, Plan, Subscription, SubscriptionStatus


class BillingRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_active_plans(self) -> list[Plan]:
        stmt = select(Plan).where(Plan.is_active.is_(True)).order_by(Plan.monthly_price.asc())
        return list(self.db.execute(stmt).scalars().all())

    def get_plan_by_code(self, code: str) -> Plan | None:
        stmt = select(Plan).where(Plan.code == code, Plan.is_active.is_(True))
        return self.db.execute(stmt).scalar_one_or_none()

    def get_any_plan_by_code(self, code: str) -> Plan | None:
        stmt = select(Plan).where(Plan.code == code)
        return self.db.execute(stmt).scalar_one_or_none()

    def create_plan(self, **data) -> Plan:
        plan = Plan(**data)
        self.db.add(plan)
        self.db.flush()
        return plan

    def get_current_subscription(self, organization_id: int) -> Subscription | None:
        stmt = (
            select(Subscription)
            .options(joinedload(Subscription.plan))
            .where(
                and_(
                    Subscription.organization_id == organization_id,
                    Subscription.status.in_([SubscriptionStatus.trialing, SubscriptionStatus.active, SubscriptionStatus.past_due]),
                )
            )
            .order_by(Subscription.started_at.desc())
        )
        return self.db.execute(stmt).scalars().first()

    def list_invoices(self, organization_id: int) -> list[Invoice]:
        stmt = select(Invoice).where(Invoice.organization_id == organization_id).order_by(Invoice.created_at.desc())
        return list(self.db.execute(stmt).scalars().all())

    def create_subscription(self, **data) -> Subscription:
        subscription = Subscription(**data)
        self.db.add(subscription)
        self.db.flush()
        return subscription

    def create_invoice(self, **data) -> Invoice:
        invoice = Invoice(**data)
        self.db.add(invoice)
        self.db.flush()
        return invoice

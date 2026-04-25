from __future__ import annotations

from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Assistant, Conversation, Invoice, InvoiceStatus, Message, Organization, OrganizationMember, Subscription, SubscriptionStatus, UsageEvent
from app.schemas.admin import AdminOverviewOut


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def overview(self, organization_id: int) -> AdminOverviewOut:
        assistant_ids = select(Assistant.id).where(Assistant.organization_id == organization_id)
        conversation_ids = select(Conversation.id).where(Conversation.assistant_id.in_(assistant_ids))

        users = self.db.execute(
            select(func.count(OrganizationMember.id)).where(OrganizationMember.organization_id == organization_id)
        ).scalar_one()
        organizations = self.db.execute(
            select(func.count(Organization.id)).where(Organization.id == organization_id)
        ).scalar_one()
        assistants = self.db.execute(
            select(func.count(Assistant.id)).where(Assistant.organization_id == organization_id)
        ).scalar_one()
        conversations = self.db.execute(
            select(func.count(Conversation.id)).where(Conversation.assistant_id.in_(assistant_ids))
        ).scalar_one()
        messages = self.db.execute(
            select(func.count(Message.id)).where(Message.conversation_id.in_(conversation_ids))
        ).scalar_one()
        usage_events = self.db.execute(
            select(func.count(UsageEvent.id)).where(UsageEvent.organization_id == organization_id)
        ).scalar_one()
        active_subscriptions = self.db.execute(
            select(func.count(Subscription.id)).where(
                Subscription.organization_id == organization_id,
                Subscription.status.in_([SubscriptionStatus.active, SubscriptionStatus.trialing, SubscriptionStatus.past_due]),
            )
        ).scalar_one()
        paid_invoices = self.db.execute(
            select(func.count(Invoice.id)).where(Invoice.organization_id == organization_id, Invoice.status == InvoiceStatus.paid)
        ).scalar_one()
        paid_revenue = self.db.execute(
            select(func.coalesce(func.sum(Invoice.amount), 0)).where(
                Invoice.organization_id == organization_id,
                Invoice.status == InvoiceStatus.paid,
            )
        ).scalar_one()

        return AdminOverviewOut(
            users=int(users),
            organizations=int(organizations),
            assistants=int(assistants),
            conversations=int(conversations),
            messages=int(messages),
            usage_events=int(usage_events),
            active_subscriptions=int(active_subscriptions),
            paid_invoices=int(paid_invoices),
            paid_revenue=self._float(paid_revenue),
        )

    @staticmethod
    def _float(value) -> float:
        if isinstance(value, Decimal):
            return float(value)
        return float(value or 0)

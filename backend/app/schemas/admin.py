from __future__ import annotations

from pydantic import BaseModel


class AdminOverviewOut(BaseModel):
    users: int
    organizations: int
    assistants: int
    conversations: int
    messages: int
    usage_events: int
    active_subscriptions: int
    paid_invoices: int
    paid_revenue: float

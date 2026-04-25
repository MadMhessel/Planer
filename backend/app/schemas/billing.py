from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

SubscriptionStatusLiteral = Literal['trialing', 'active', 'canceled', 'past_due']
InvoiceStatusLiteral = Literal['pending', 'paid', 'failed', 'void']


class PlanOut(BaseModel):
    id: int
    name: str
    code: str
    monthly_price: float
    limits: dict
    features: dict
    is_active: bool


class SubscriptionOut(BaseModel):
    id: int
    organization_id: int
    plan: PlanOut
    status: SubscriptionStatusLiteral
    started_at: datetime
    expires_at: datetime | None
    auto_renew: bool
    provider: str | None
    provider_subscription_id: str | None


class InvoiceOut(BaseModel):
    id: int
    organization_id: int
    subscription_id: int
    amount: float
    currency: str
    status: InvoiceStatusLiteral
    provider: str | None
    provider_invoice_id: str | None
    paid_at: datetime | None
    created_at: datetime


class CurrentBillingOut(BaseModel):
    subscription: SubscriptionOut | None
    plan: PlanOut | None


class SubscribeRequest(BaseModel):
    plan_code: str = Field(min_length=2, max_length=80)
    auto_renew: bool = True
    provider: str = Field(default='manual', max_length=64)


class SubscribeResponse(BaseModel):
    subscription: SubscriptionOut
    invoice: InvoiceOut


class BillingUsageOut(BaseModel):
    messages: int
    tokens: float
    uploads: float
    deployments: float
    api_calls: float
    estimated_cost: float


class CheckoutRequest(BaseModel):
    plan_code: str = Field(min_length=2, max_length=80)
    return_url: str | None = Field(default=None, max_length=2048)


class CheckoutResponse(BaseModel):
    invoice: InvoiceOut
    provider_payment_id: str
    confirmation_url: str
    status: str


class BillingLimitsOut(BaseModel):
    limits: dict
    usage: dict[str, float]
    subscription: SubscriptionOut | None

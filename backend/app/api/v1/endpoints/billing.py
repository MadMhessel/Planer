from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.api.deps import RequestContext, get_request_context, require_roles
from app.db.models import OrganizationMemberRole
from app.db.session import get_db
from app.schemas.billing import (
    BillingLimitsOut,
    BillingUsageOut,
    CheckoutRequest,
    CheckoutResponse,
    CurrentBillingOut,
    InvoiceOut,
    PlanOut,
    SubscribeRequest,
    SubscribeResponse,
    SubscriptionOut,
)
from app.services.billing_service import BillingService

router = APIRouter(prefix='/billing', tags=['billing'])


@router.get('/plans', response_model=list[PlanOut])
def list_plans(db: Session = Depends(get_db)) -> list[PlanOut]:
    service = BillingService(db)
    return [service.plan_out(plan) for plan in service.list_plans()]


@router.get('/plan', response_model=CurrentBillingOut)
def current_plan(
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> CurrentBillingOut:
    service = BillingService(db)
    subscription = service.current_subscription(context.organization.id)
    if subscription is None:
        return CurrentBillingOut(subscription=None, plan=None)
    subscription_out = service.subscription_out(subscription)
    return CurrentBillingOut(subscription=subscription_out, plan=subscription_out.plan)


@router.post('/subscribe', response_model=SubscribeResponse)
def subscribe(
    payload: SubscribeRequest,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin)),
    ],
    db: Session = Depends(get_db),
) -> SubscribeResponse:
    service = BillingService(db)
    subscription, invoice = service.subscribe(context.organization.id, payload)
    return SubscribeResponse(subscription=service.subscription_out(subscription), invoice=service.invoice_out(invoice))


@router.post('/checkout', response_model=CheckoutResponse)
def create_checkout(
    payload: CheckoutRequest,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin)),
    ],
    db: Session = Depends(get_db),
) -> CheckoutResponse:
    return BillingService(db).create_checkout(context.organization.id, payload)


@router.post('/webhooks/yookassa')
async def yookassa_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_yookassa_signature: str | None = Header(default=None, alias='X-Yookassa-Signature'),
) -> dict:
    raw_body = await request.body()
    payload = await request.json()
    return BillingService(db).process_yookassa_webhook(payload, raw_body=raw_body, signature=x_yookassa_signature)


@router.post('/renew')
def renew_subscriptions(
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin)),
    ],
    db: Session = Depends(get_db),
) -> dict:
    return BillingService(db).renew_due_subscriptions()


@router.get('/limits', response_model=BillingLimitsOut)
def billing_limits(
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> BillingLimitsOut:
    return BillingLimitsOut(**BillingService(db).limits_payload(context.organization.id))


@router.get('/invoices', response_model=list[InvoiceOut])
def list_invoices(
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> list[InvoiceOut]:
    service = BillingService(db)
    return [service.invoice_out(invoice) for invoice in service.list_invoices(context.organization.id)]


@router.post('/cancel', response_model=SubscriptionOut | None)
def cancel_subscription(
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin)),
    ],
    db: Session = Depends(get_db),
) -> SubscriptionOut | None:
    service = BillingService(db)
    subscription = service.cancel(context.organization.id)
    return service.subscription_out(subscription) if subscription is not None else None


@router.get('/usage', response_model=BillingUsageOut)
def billing_usage(
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> BillingUsageOut:
    return BillingService(db).usage(context.organization.id)


@router.get('/usage/current', response_model=BillingUsageOut)
def current_billing_usage(
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> BillingUsageOut:
    return BillingService(db).usage(context.organization.id)

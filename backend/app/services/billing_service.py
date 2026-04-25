from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import hashlib
import hmac

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.adapters.yookassa_adapter import YooKassaAdapter
from app.core.config import get_settings
from app.core.errors import APIError
from app.db.models import Invoice, InvoiceStatus, Organization, PaymentMethod, PaymentMethodStatus, Plan, Subscription, SubscriptionStatus, UsageEvent, UsageEventType
from app.repositories.billing import BillingRepository
from app.schemas.billing import BillingUsageOut, CheckoutRequest, CheckoutResponse, InvoiceOut, PlanOut, SubscribeRequest, SubscriptionOut
from app.services.limit_service import LimitService


DEFAULT_PLANS = [
    {
        'name': 'Starter',
        'code': 'starter',
        'monthly_price': 4990,
        'limits_json': {'assistants': 1, 'storage_mb': 50, 'messages': 1000, 'tokens': 400000, 'integrations': 1, 'deployments': 1},
        'features_json': {'telegram': True, 'web_widget': False, 'integrations': False, 'white_label': False},
    },
    {
        'name': 'Growth',
        'code': 'growth',
        'monthly_price': 14990,
        'limits_json': {'assistants': 3, 'storage_mb': 500, 'messages': 10000, 'tokens': 4000000, 'integrations': 10, 'deployments': 5},
        'features_json': {'telegram': True, 'web_widget': True, 'integrations': True, 'white_label': False},
    },
    {
        'name': 'Business',
        'code': 'business',
        'monthly_price': 44990,
        'limits_json': {'assistants': None, 'storage_mb': None, 'messages': None, 'tokens': None, 'integrations': None, 'deployments': None},
        'features_json': {'telegram': True, 'web_widget': True, 'integrations': True, 'white_label': True, 'sla': True},
    },
]


class BillingService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = BillingRepository(db)
        self.settings = get_settings()

    def ensure_default_plans(self) -> None:
        changed = False
        for item in DEFAULT_PLANS:
            existing = self.repo.get_any_plan_by_code(item['code'])
            if existing is None:
                self.repo.create_plan(
                    name=item['name'],
                    code=item['code'],
                    monthly_price=item['monthly_price'],
                    limits_json=json.dumps(item['limits_json'], ensure_ascii=False),
                    features_json=json.dumps(item['features_json'], ensure_ascii=False),
                    is_active=True,
                )
                changed = True
        if changed:
            self.db.commit()

    def list_plans(self) -> list[Plan]:
        self.ensure_default_plans()
        return self.repo.list_active_plans()

    def current_subscription(self, organization_id: int) -> Subscription | None:
        return self.repo.get_current_subscription(organization_id)

    def subscribe(self, organization_id: int, payload: SubscribeRequest) -> tuple[Subscription, Invoice]:
        self.ensure_default_plans()
        plan = self.repo.get_plan_by_code(payload.plan_code)
        if plan is None:
            raise APIError(status_code=404, error_code='plan_not_found', message='Тариф не найден')

        current = self.repo.get_current_subscription(organization_id)
        if current is not None:
            current.status = SubscriptionStatus.canceled
            current.auto_renew = False

        now = datetime.now(timezone.utc)
        subscription = self.repo.create_subscription(
            organization_id=organization_id,
            plan_id=plan.id,
            status=SubscriptionStatus.active,
            started_at=now,
            expires_at=now + timedelta(days=30),
            auto_renew=payload.auto_renew,
            provider=payload.provider,
            provider_subscription_id=f'sub_{uuid.uuid4().hex[:16]}',
        )

        invoice = self.repo.create_invoice(
            organization_id=organization_id,
            subscription_id=subscription.id,
            amount=plan.monthly_price,
            currency='RUB',
            status=InvoiceStatus.paid,
            provider=payload.provider,
            provider_invoice_id=f'inv_{uuid.uuid4().hex[:16]}',
            paid_at=now,
            created_at=now,
        )

        organization = self.db.get(Organization, organization_id)
        if organization is not None:
            organization.plan_id = plan.id

        self.db.commit()
        self.db.refresh(subscription)
        self.db.refresh(invoice)
        return subscription, invoice

    def cancel(self, organization_id: int) -> Subscription | None:
        current = self.repo.get_current_subscription(organization_id)
        if current is None:
            return None

        current.status = SubscriptionStatus.canceled
        current.auto_renew = False
        self.db.commit()
        self.db.refresh(current)
        return current

    def list_invoices(self, organization_id: int) -> list[Invoice]:
        return self.repo.list_invoices(organization_id)

    def create_checkout(self, organization_id: int, payload: CheckoutRequest) -> CheckoutResponse:
        self.ensure_default_plans()
        plan = self.repo.get_plan_by_code(payload.plan_code)
        if plan is None:
            raise APIError(status_code=404, error_code='plan_not_found', message='Тариф не найден')

        current = self.repo.get_current_subscription(organization_id)
        if current is not None:
            current.status = SubscriptionStatus.canceled
            current.auto_renew = False

        now = datetime.now(timezone.utc)
        subscription = self.repo.create_subscription(
            organization_id=organization_id,
            plan_id=plan.id,
            status=SubscriptionStatus.past_due,
            started_at=now,
            expires_at=now + timedelta(days=30),
            auto_renew=True,
            provider='yookassa',
            provider_subscription_id=f'pending_{uuid.uuid4().hex[:16]}',
        )
        invoice = self.repo.create_invoice(
            organization_id=organization_id,
            subscription_id=subscription.id,
            amount=plan.monthly_price,
            currency='RUB',
            status=InvoiceStatus.pending,
            provider='yookassa',
            provider_invoice_id=f'pending_{uuid.uuid4().hex[:16]}',
            paid_at=None,
            created_at=now,
        )
        self.db.flush()

        checkout = YooKassaAdapter().create_checkout(
            amount=float(plan.monthly_price),
            currency='RUB',
            description=f'Подписка AI Ассистенты: {plan.name}',
            return_url=payload.return_url or f'{self.settings.public_frontend_url}/dashboard?billing=success',
            metadata={
                'organization_id': organization_id,
                'subscription_id': subscription.id,
                'invoice_id': invoice.id,
                'plan_code': plan.code,
            },
        )
        invoice.provider_invoice_id = checkout.provider_payment_id
        subscription.provider_subscription_id = checkout.provider_payment_id
        self.db.commit()
        self.db.refresh(invoice)
        self.db.refresh(subscription)

        return CheckoutResponse(
            invoice=self.invoice_out(invoice),
            provider_payment_id=checkout.provider_payment_id,
            confirmation_url=checkout.confirmation_url,
            status=checkout.status,
        )

    def process_yookassa_webhook(self, payload: dict, *, raw_body: bytes = b'', signature: str | None = None) -> dict:
        self._verify_webhook_signature(raw_body, signature)
        event = payload.get('event') or ''
        payment = payload.get('object') if isinstance(payload.get('object'), dict) else payload
        metadata = payment.get('metadata') or {}
        invoice_id = self._int_or_none(metadata.get('invoice_id'))
        subscription_id = self._int_or_none(metadata.get('subscription_id'))

        invoice = self.db.get(Invoice, invoice_id) if invoice_id else None
        subscription = self.db.get(Subscription, subscription_id) if subscription_id else None
        if invoice is None or subscription is None:
            return {'status': 'ignored', 'reason': 'invoice_or_subscription_not_found', 'event': event}

        status = payment.get('status')
        if status == 'succeeded' or event == 'payment.succeeded':
            invoice.status = InvoiceStatus.paid
            invoice.paid_at = datetime.now(timezone.utc)
            subscription.status = SubscriptionStatus.active
            subscription.started_at = invoice.paid_at
            subscription.expires_at = invoice.paid_at + timedelta(days=30)
            organization = self.db.get(Organization, subscription.organization_id)
            if organization is not None:
                organization.plan_id = subscription.plan_id
            self._upsert_payment_method(subscription.organization_id, payment)
        elif status in {'canceled', 'failed'} or event in {'payment.canceled', 'payment.failed'}:
            invoice.status = InvoiceStatus.failed
            subscription.status = SubscriptionStatus.past_due

        self.db.commit()
        return {'status': 'ok', 'event': event, 'payment_status': status}

    def renew_due_subscriptions(self) -> dict:
        now = datetime.now(timezone.utc)
        stmt = select(Subscription).where(
            Subscription.status == SubscriptionStatus.active,
            Subscription.auto_renew.is_(True),
            Subscription.expires_at.is_not(None),
            Subscription.expires_at <= now,
        )
        subscriptions = list(self.db.execute(stmt).scalars().all())
        charged = 0
        failed = 0
        adapter = YooKassaAdapter()

        for subscription in subscriptions:
            method = self._active_payment_method(subscription.organization_id)
            if method is None:
                subscription.status = SubscriptionStatus.past_due
                failed += 1
                continue
            try:
                payment = adapter.charge_saved_method(
                    payment_method_id=method.provider_payment_method_id,
                    amount=float(subscription.plan.monthly_price),
                    currency='RUB',
                    description=f'Продление подписки AI Ассистенты: {subscription.plan.name}',
                    metadata={'organization_id': subscription.organization_id, 'subscription_id': subscription.id},
                )
                invoice = self.repo.create_invoice(
                    organization_id=subscription.organization_id,
                    subscription_id=subscription.id,
                    amount=subscription.plan.monthly_price,
                    currency='RUB',
                    status=InvoiceStatus.paid if payment.get('status') == 'succeeded' else InvoiceStatus.pending,
                    provider='yookassa',
                    provider_invoice_id=payment.get('id'),
                    paid_at=now if payment.get('status') == 'succeeded' else None,
                    created_at=now,
                )
                if invoice.status == InvoiceStatus.paid:
                    subscription.expires_at = now + timedelta(days=30)
                    charged += 1
            except Exception:
                subscription.status = SubscriptionStatus.past_due
                failed += 1

        self.db.commit()
        return {'status': 'ok', 'processed': len(subscriptions), 'charged': charged, 'failed': failed}

    def limits_payload(self, organization_id: int) -> dict:
        limit_service = LimitService(self.db)
        current = self.repo.get_current_subscription(organization_id)
        return {
            'limits': limit_service.limits(organization_id),
            'usage': limit_service.current_usage(organization_id),
            'subscription': self.subscription_out(current) if current else None,
        }

    def usage(self, organization_id: int) -> BillingUsageOut:
        stmt = (
            select(UsageEvent.type, UsageEvent.unit, func.coalesce(func.sum(UsageEvent.amount), 0), func.coalesce(func.sum(UsageEvent.cost), 0))
            .where(UsageEvent.organization_id == organization_id)
            .group_by(UsageEvent.type, UsageEvent.unit)
        )
        rows = self.db.execute(stmt).all()

        messages = 0
        tokens = 0.0
        uploads = 0.0
        deployments = 0.0
        api_calls = 0.0
        estimated_cost = 0.0

        for event_type, unit, amount, cost in rows:
            amount_float = self._float(amount)
            estimated_cost += self._float(cost)
            if event_type == UsageEventType.message:
                messages += 1
                if unit == 'tokens':
                    tokens += amount_float
            elif event_type == UsageEventType.upload:
                uploads += amount_float
            elif event_type == UsageEventType.deploy:
                deployments += amount_float
            elif event_type == UsageEventType.api_call:
                api_calls += amount_float
            elif event_type == UsageEventType.embedding:
                tokens += amount_float

        return BillingUsageOut(
            messages=messages,
            tokens=tokens,
            uploads=uploads,
            deployments=deployments,
            api_calls=api_calls,
            estimated_cost=estimated_cost,
        )

    @classmethod
    def plan_out(cls, plan: Plan) -> PlanOut:
        return PlanOut(
            id=plan.id,
            name=plan.name,
            code=plan.code,
            monthly_price=cls._float(plan.monthly_price),
            limits=cls._json(plan.limits_json),
            features=cls._json(plan.features_json),
            is_active=plan.is_active,
        )

    @classmethod
    def subscription_out(cls, subscription: Subscription) -> SubscriptionOut:
        return SubscriptionOut(
            id=subscription.id,
            organization_id=subscription.organization_id,
            plan=cls.plan_out(subscription.plan),
            status=subscription.status.value,
            started_at=subscription.started_at,
            expires_at=subscription.expires_at,
            auto_renew=subscription.auto_renew,
            provider=subscription.provider,
            provider_subscription_id=subscription.provider_subscription_id,
        )

    @classmethod
    def invoice_out(cls, invoice: Invoice) -> InvoiceOut:
        return InvoiceOut(
            id=invoice.id,
            organization_id=invoice.organization_id,
            subscription_id=invoice.subscription_id,
            amount=cls._float(invoice.amount),
            currency=invoice.currency,
            status=invoice.status.value,
            provider=invoice.provider,
            provider_invoice_id=invoice.provider_invoice_id,
            paid_at=invoice.paid_at,
            created_at=invoice.created_at,
        )

    @staticmethod
    def _json(value: str | None) -> dict:
        if not value:
            return {}
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}

    @staticmethod
    def _float(value) -> float:
        if isinstance(value, Decimal):
            return float(value)
        return float(value or 0)

    def _verify_webhook_signature(self, raw_body: bytes, signature: str | None) -> None:
        if not self.settings.yookassa_webhook_secret:
            return
        expected = hmac.new(self.settings.yookassa_webhook_secret.encode('utf-8'), raw_body, hashlib.sha256).hexdigest()
        if not signature or not hmac.compare_digest(expected, signature):
            raise APIError(status_code=401, error_code='invalid_webhook_signature', message='Некорректная подпись webhook')

    def _upsert_payment_method(self, organization_id: int, payment: dict) -> None:
        method = payment.get('payment_method') if isinstance(payment.get('payment_method'), dict) else {}
        provider_method_id = method.get('id')
        if not provider_method_id:
            return

        stmt = select(PaymentMethod).where(
            PaymentMethod.organization_id == organization_id,
            PaymentMethod.provider == 'yookassa',
            PaymentMethod.provider_payment_method_id == provider_method_id,
        )
        existing = self.db.execute(stmt).scalar_one_or_none()
        title = method.get('title') or method.get('type')
        if existing is None:
            self.db.add(
                PaymentMethod(
                    organization_id=organization_id,
                    provider='yookassa',
                    provider_payment_method_id=provider_method_id,
                    title=title,
                    status=PaymentMethodStatus.active,
                    metadata_json=json.dumps(method, ensure_ascii=False),
                )
            )
        else:
            existing.status = PaymentMethodStatus.active
            existing.title = title
            existing.metadata_json = json.dumps(method, ensure_ascii=False)

    def _active_payment_method(self, organization_id: int) -> PaymentMethod | None:
        stmt = (
            select(PaymentMethod)
            .where(
                PaymentMethod.organization_id == organization_id,
                PaymentMethod.provider == 'yookassa',
                PaymentMethod.status == PaymentMethodStatus.active,
            )
            .order_by(PaymentMethod.updated_at.desc())
        )
        return self.db.execute(stmt).scalars().first()

    @staticmethod
    def _int_or_none(value) -> int | None:
        try:
            return int(value)
        except Exception:
            return None

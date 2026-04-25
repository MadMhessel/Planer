from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import get_settings


@dataclass
class CheckoutResult:
    provider_payment_id: str
    confirmation_url: str
    status: str
    raw: dict[str, Any]


class YooKassaAdapter:
    api_url = 'https://api.yookassa.ru/v3'

    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def enabled(self) -> bool:
        return bool(self.settings.yookassa_shop_id and self.settings.yookassa_secret_key)

    def create_checkout(
        self,
        *,
        amount: float,
        currency: str,
        description: str,
        return_url: str,
        metadata: dict[str, Any],
        save_payment_method: bool = True,
    ) -> CheckoutResult:
        if not self.enabled:
            mock_id = f'mock_{uuid.uuid4().hex[:16]}'
            return CheckoutResult(
                provider_payment_id=mock_id,
                confirmation_url=f'{return_url}?mock_payment_id={mock_id}',
                status='pending',
                raw={'mock': True, 'metadata': metadata},
            )

        payload = {
            'amount': {'value': f'{amount:.2f}', 'currency': currency},
            'capture': True,
            'description': description,
            'confirmation': {'type': 'redirect', 'return_url': return_url},
            'save_payment_method': save_payment_method,
            'metadata': metadata,
        }
        response = httpx.post(
            f'{self.api_url}/payments',
            auth=(self.settings.yookassa_shop_id or '', self.settings.yookassa_secret_key or ''),
            headers={'Idempotence-Key': uuid.uuid4().hex},
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        return CheckoutResult(
            provider_payment_id=data['id'],
            confirmation_url=data.get('confirmation', {}).get('confirmation_url') or return_url,
            status=data.get('status') or 'pending',
            raw=data,
        )

    def charge_saved_method(
        self,
        *,
        payment_method_id: str,
        amount: float,
        currency: str,
        description: str,
        metadata: dict[str, Any],
    ) -> dict[str, Any]:
        if not self.enabled:
            return {'id': f'mock_{uuid.uuid4().hex[:16]}', 'status': 'succeeded', 'metadata': metadata}

        payload = {
            'amount': {'value': f'{amount:.2f}', 'currency': currency},
            'capture': True,
            'payment_method_id': payment_method_id,
            'description': description,
            'metadata': metadata,
        }
        response = httpx.post(
            f'{self.api_url}/payments',
            auth=(self.settings.yookassa_shop_id or '', self.settings.yookassa_secret_key or ''),
            headers={'Idempotence-Key': uuid.uuid4().hex},
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

from __future__ import annotations


def _auth_header(token: str) -> dict[str, str]:
    return {'Authorization': f'Bearer {token}'}


def _register(client) -> tuple[str, int]:
    res = client.post(
        '/api/v1/auth/register',
        json={
            'email': 'commercial@example.com',
            'password': 'StrongPass123',
            'full_name': 'Commercial Owner',
            'organization_name': 'Commercial Org',
        },
    )
    assert res.status_code == 200, res.text
    data = res.json()
    return data['tokens']['access_token'], data['organization_id']


def _create_assistant(client, headers: dict[str, str]) -> int:
    res = client.post(
        '/api/v1/assistants',
        headers=headers,
        json={'name': 'КоммерческийБот', 'system_prompt': 'Отвечай на русском языке.'},
    )
    assert res.status_code == 200, res.text
    return res.json()['id']


def test_checkout_webhook_limits_and_widget_runtime(client) -> None:
    token, organization_id = _register(client)
    headers = _auth_header(token)
    assistant_id = _create_assistant(client, headers)

    checkout = client.post('/api/v1/billing/checkout', headers=headers, json={'plan_code': 'growth'})
    assert checkout.status_code == 200, checkout.text
    checkout_data = checkout.json()
    assert checkout_data['confirmation_url']
    invoice = checkout_data['invoice']

    webhook = client.post(
        '/api/v1/billing/webhooks/yookassa',
        json={
            'event': 'payment.succeeded',
            'object': {
                'id': checkout_data['provider_payment_id'],
                'status': 'succeeded',
                'metadata': {
                    'organization_id': organization_id,
                    'subscription_id': invoice['subscription_id'],
                    'invoice_id': invoice['id'],
                    'plan_code': 'growth',
                },
                'payment_method': {'id': 'pm_test_123', 'type': 'bank_card', 'title': 'Тестовая карта'},
            },
        },
    )
    assert webhook.status_code == 200, webhook.text
    assert webhook.json()['status'] == 'ok'

    current = client.get('/api/v1/billing/plan', headers=headers)
    assert current.status_code == 200, current.text
    assert current.json()['subscription']['status'] == 'active'

    limits = client.get('/api/v1/billing/limits', headers=headers)
    assert limits.status_code == 200, limits.text
    assert limits.json()['limits']['storage_mb'] == 500

    deploy_widget = client.post(
        f'/api/v1/assistants/{assistant_id}/deploy/web-widget',
        headers=headers,
        json={'domain': 'testpromo.lab.denis-dev.ru', 'welcome_text': 'Добрый день!'},
    )
    assert deploy_widget.status_code == 200, deploy_widget.text
    config = deploy_widget.json()['config']
    widget_id = config['widget_id']

    widget_config = client.get(f'/api/v1/public/widget/{widget_id}/config')
    assert widget_config.status_code == 200, widget_config.text
    assert widget_config.json()['assistant_name'] == 'КоммерческийБот'

    chat = client.post(
        f'/api/v1/public/widget/{widget_id}/chat',
        json={'message': 'Здравствуйте', 'user_external_id': 'site-user', 'channel_type': 'web'},
    )
    assert chat.status_code == 200, chat.text
    assert chat.json()['assistant_message']['content']

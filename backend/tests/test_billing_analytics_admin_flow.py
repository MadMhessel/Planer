from __future__ import annotations


def _auth_header(token: str) -> dict[str, str]:
    return {'Authorization': f'Bearer {token}'}


def _register_and_token(client) -> str:
    payload = {
        'email': 'billing-owner@example.com',
        'password': 'StrongPass123',
        'full_name': 'Billing Owner',
        'organization_name': 'Billing Org',
    }
    res = client.post('/api/v1/auth/register', json=payload)
    assert res.status_code == 200, res.text
    return res.json()['tokens']['access_token']


def _create_assistant(client, headers: dict[str, str]) -> int:
    res = client.post(
        '/api/v1/assistants',
        headers=headers,
        json={
            'name': 'АналитикаБот',
            'description': 'Проверка аналитики',
            'welcome_message': 'Здравствуйте, я помогу с вопросом.',
            'model_name': 'mvp-model',
        },
    )
    assert res.status_code == 200, res.text
    return res.json()['id']


def test_billing_analytics_and_admin_flow(client) -> None:
    token = _register_and_token(client)
    headers = _auth_header(token)

    plans_res = client.get('/api/v1/billing/plans')
    assert plans_res.status_code == 200, plans_res.text
    plans = plans_res.json()
    assert [item['code'] for item in plans] == ['starter', 'growth', 'business']

    subscribe_res = client.post(
        '/api/v1/billing/subscribe',
        headers=headers,
        json={'plan_code': 'growth', 'auto_renew': True, 'provider': 'manual'},
    )
    assert subscribe_res.status_code == 200, subscribe_res.text
    subscription = subscribe_res.json()['subscription']
    invoice = subscribe_res.json()['invoice']
    assert subscription['status'] == 'active'
    assert subscription['plan']['code'] == 'growth'
    assert invoice['status'] == 'paid'
    assert invoice['amount'] == 14990.0

    current_plan = client.get('/api/v1/billing/plan', headers=headers)
    assert current_plan.status_code == 200, current_plan.text
    assert current_plan.json()['plan']['code'] == 'growth'

    invoices = client.get('/api/v1/billing/invoices', headers=headers)
    assert invoices.status_code == 200, invoices.text
    assert len(invoices.json()) == 1

    assistant_id = _create_assistant(client, headers)
    chat_res = client.post(
        f'/api/v1/assistants/{assistant_id}/chat',
        headers=headers,
        json={
            'message': 'Расскажите про оплату и тариф Growth',
            'user_external_id': 'billing-user',
            'channel_type': 'web',
        },
    )
    assert chat_res.status_code == 200, chat_res.text
    conversation_id = chat_res.json()['conversation']['id']

    deploy_res = client.post(
        f'/api/v1/assistants/{assistant_id}/deploy/telegram',
        headers=headers,
        json={'bot_token': '123456789:SPRINT5_TOKEN'},
    )
    assert deploy_res.status_code == 200, deploy_res.text

    usage = client.get('/api/v1/billing/usage', headers=headers)
    assert usage.status_code == 200, usage.text
    usage_data = usage.json()
    assert usage_data['messages'] >= 1
    assert usage_data['tokens'] > 0
    assert usage_data['deployments'] >= 1

    overview = client.get(f'/api/v1/assistants/{assistant_id}/analytics/overview', headers=headers)
    assert overview.status_code == 200, overview.text
    overview_data = overview.json()
    assert overview_data['total_conversations'] == 1
    assert overview_data['messages_this_month'] >= 2
    assert overview_data['total_tokens'] > 0

    message_volume = client.get(f'/api/v1/assistants/{assistant_id}/analytics/messages', headers=headers)
    assert message_volume.status_code == 200, message_volume.text
    assert len(message_volume.json()) == 1

    intents = client.get(f'/api/v1/assistants/{assistant_id}/analytics/intents', headers=headers)
    assert intents.status_code == 200, intents.text
    assert intents.json()[0]['name'] == 'Оплата и тарифы'

    conversations = client.get(f'/api/v1/assistants/{assistant_id}/analytics/conversations', headers=headers)
    assert conversations.status_code == 200, conversations.text
    assert conversations.json()[0]['id'] == conversation_id
    assert conversations.json()[0]['messages_count'] == 2

    failed = client.get(f'/api/v1/assistants/{assistant_id}/analytics/failed', headers=headers)
    assert failed.status_code == 200, failed.text
    assert failed.json() == []

    admin_overview = client.get('/api/v1/admin/overview', headers=headers)
    assert admin_overview.status_code == 200, admin_overview.text
    admin_data = admin_overview.json()
    assert admin_data['assistants'] == 1
    assert admin_data['conversations'] == 1
    assert admin_data['paid_invoices'] == 1
    assert admin_data['paid_revenue'] == 14990.0

    cancel = client.post('/api/v1/billing/cancel', headers=headers)
    assert cancel.status_code == 200, cancel.text
    assert cancel.json()['status'] == 'canceled'

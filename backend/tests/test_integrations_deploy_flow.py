from __future__ import annotations

from sqlalchemy import func, select

from app.db.models import DeploymentChannel, Integration, UsageEvent, UsageEventType
from app.db.session import SessionLocal


def _auth_header(token: str) -> dict[str, str]:
    return {'Authorization': f'Bearer {token}'}


def _register_and_token(client) -> str:
    payload = {
        'email': 'deploy-owner@example.com',
        'password': 'StrongPass123',
        'full_name': 'Deploy Owner',
        'organization_name': 'Deploy Org',
    }
    res = client.post('/api/v1/auth/register', json=payload)
    assert res.status_code == 200, res.text
    return res.json()['tokens']['access_token']


def _create_assistant(client, headers: dict[str, str]) -> int:
    res = client.post(
        '/api/v1/assistants',
        headers=headers,
        json={
            'name': 'ИнтеграцииБот',
            'description': 'Проверка deploy и integrations',
            'model_name': 'mvp-model',
        },
    )
    assert res.status_code == 200, res.text
    return res.json()['id']


def test_integrations_and_deploy_endpoints(client) -> None:
    token = _register_and_token(client)
    headers = _auth_header(token)
    assistant_id = _create_assistant(client, headers)

    integration_create = client.post(
        f'/api/v1/assistants/{assistant_id}/integrations',
        headers=headers,
        json={
            'type': 'telegram',
            'name': 'Telegram Bot',
            'config': {
                'bot_token': '123456789:TEST_TOKEN_VALUE',
            },
        },
    )
    assert integration_create.status_code == 200, integration_create.text
    integration = integration_create.json()
    integration_id = integration['id']
    assert integration['status'] == 'disconnected'
    assert integration['config']['bot_token'] == '123456789:TEST_TOKEN_VALUE'

    integration_test = client.post(f'/api/v1/integrations/{integration_id}/test', headers=headers)
    assert integration_test.status_code == 200, integration_test.text
    assert integration_test.json()['status'] == 'connected'

    integration_sync = client.post(f'/api/v1/integrations/{integration_id}/sync', headers=headers)
    assert integration_sync.status_code == 200, integration_sync.text
    assert integration_sync.json()['status'] == 'connected'
    assert integration_sync.json()['last_sync_at'] is not None

    integration_update = client.patch(
        f'/api/v1/integrations/{integration_id}',
        headers=headers,
        json={
            'name': 'Telegram Bot Updated',
            'config': {
                'bot_token': '123456789:UPDATED_TOKEN',
            },
        },
    )
    assert integration_update.status_code == 200, integration_update.text
    assert integration_update.json()['name'] == 'Telegram Bot Updated'

    integrations_list = client.get(f'/api/v1/assistants/{assistant_id}/integrations', headers=headers)
    assert integrations_list.status_code == 200, integrations_list.text
    assert len(integrations_list.json()) == 1

    deploy_telegram = client.post(
        f'/api/v1/assistants/{assistant_id}/deploy/telegram',
        headers=headers,
        json={
            'bot_token': '123456789:UPDATED_TOKEN',
            'webhook_url': 'https://example.com/telegram/webhook',
        },
    )
    assert deploy_telegram.status_code == 200, deploy_telegram.text
    assert deploy_telegram.json()['channel_type'] == 'telegram'

    deploy_widget = client.post(
        f'/api/v1/assistants/{assistant_id}/deploy/web-widget',
        headers=headers,
        json={
            'domain': 'widget.example.com',
            'welcome_text': 'Здравствуйте! Чем помочь?',
        },
    )
    assert deploy_widget.status_code == 200, deploy_widget.text
    assert deploy_widget.json()['channel_type'] == 'web_widget'
    assert 'script' in (deploy_widget.json()['embed_code'] or '')

    deploy_webhook = client.post(
        f'/api/v1/assistants/{assistant_id}/deploy/webhook',
        headers=headers,
        json={
            'target_url': 'https://api.example.com/hook',
            'secret': 'super-secret-token',
        },
    )
    assert deploy_webhook.status_code == 200, deploy_webhook.text
    assert deploy_webhook.json()['channel_type'] == 'webhook'

    deployments = client.get(f'/api/v1/assistants/{assistant_id}/deployments', headers=headers)
    assert deployments.status_code == 200, deployments.text
    deployment_items = deployments.json()
    assert len(deployment_items) == 3

    deployment_to_delete = deployment_items[0]['id']
    delete_deployment = client.delete(f'/api/v1/deployments/{deployment_to_delete}', headers=headers)
    assert delete_deployment.status_code == 200, delete_deployment.text

    deployments_after = client.get(f'/api/v1/assistants/{assistant_id}/deployments', headers=headers)
    assert deployments_after.status_code == 200, deployments_after.text
    assert len(deployments_after.json()) == 2

    with SessionLocal() as session:
        encrypted_config = session.execute(
            select(Integration.config_encrypted).where(Integration.id == integration_id)
        ).scalar_one()
        assert 'UPDATED_TOKEN' not in encrypted_config

    delete_integration = client.delete(f'/api/v1/integrations/{integration_id}', headers=headers)
    assert delete_integration.status_code == 200, delete_integration.text

    integrations_after = client.get(f'/api/v1/assistants/{assistant_id}/integrations', headers=headers)
    assert integrations_after.status_code == 200, integrations_after.text
    assert integrations_after.json() == []

    with SessionLocal() as session:
        integrations_count = session.execute(
            select(func.count(Integration.id)).where(Integration.assistant_id == assistant_id)
        ).scalar_one()
        assert integrations_count == 0

        deployments_count = session.execute(
            select(func.count(DeploymentChannel.id)).where(DeploymentChannel.assistant_id == assistant_id)
        ).scalar_one()
        assert deployments_count == 2

        deploy_usage = session.execute(
            select(func.count(UsageEvent.id)).where(
                UsageEvent.assistant_id == assistant_id,
                UsageEvent.type == UsageEventType.deploy,
            )
        ).scalar_one()
        assert deploy_usage >= 3

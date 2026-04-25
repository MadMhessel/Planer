from __future__ import annotations


def _auth_header(token: str) -> dict[str, str]:
    return {'Authorization': f'Bearer {token}'}


def _register_and_token(client) -> str:
    payload = {
        'email': 'founder@example.com',
        'password': 'StrongPass123',
        'full_name': 'Founder User',
        'organization_name': 'AI Бюро',
    }
    res = client.post('/api/v1/auth/register', json=payload)
    assert res.status_code == 200, res.text
    return res.json()['tokens']['access_token']


def test_assistant_crud_duplicate_archive(client) -> None:
    access_token = _register_and_token(client)
    headers = _auth_header(access_token)

    create_payload = {
        'name': 'ЮристАссистент',
        'description': 'Юридический помощник',
        'system_prompt': 'Ты юридический ассистент',
        'welcome_message': 'Здравствуйте',
        'model_provider': 'openai',
        'model_name': 'gpt-4.1-mini',
        'temperature': 0.4,
        'max_tokens': 2048,
        'memory_enabled': True,
        'is_public': False,
    }
    create_res = client.post('/api/v1/assistants', json=create_payload, headers=headers)
    assert create_res.status_code == 200, create_res.text
    assistant = create_res.json()
    assistant_id = assistant['id']
    assert assistant['slug'] == 'юристассистент'

    list_res = client.get('/api/v1/assistants', headers=headers)
    assert list_res.status_code == 200, list_res.text
    items = list_res.json()
    assert len(items) == 1

    update_res = client.patch(
        f'/api/v1/assistants/{assistant_id}',
        json={'name': 'ЮристАссистент PRO', 'temperature': 0.7},
        headers=headers,
    )
    assert update_res.status_code == 200, update_res.text
    updated = update_res.json()
    assert updated['name'] == 'ЮристАссистент PRO'
    assert updated['temperature'] == 0.7

    duplicate_res = client.post(f'/api/v1/assistants/{assistant_id}/duplicate', headers=headers)
    assert duplicate_res.status_code == 200, duplicate_res.text
    duplicate = duplicate_res.json()
    assert duplicate['name'] == 'ЮристАссистент PRO (копия)'

    archive_res = client.post(f'/api/v1/assistants/{assistant_id}/archive', headers=headers)
    assert archive_res.status_code == 200, archive_res.text
    assert archive_res.json()['status'] == 'archived'

    delete_res = client.delete(f'/api/v1/assistants/{assistant_id}', headers=headers)
    assert delete_res.status_code == 200, delete_res.text

    after_delete = client.get('/api/v1/assistants', headers=headers)
    assert after_delete.status_code == 200, after_delete.text
    remaining = after_delete.json()
    assert len(remaining) == 1
    assert remaining[0]['id'] == duplicate['id']

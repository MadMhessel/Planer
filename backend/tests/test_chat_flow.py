from __future__ import annotations

from sqlalchemy import func, select

from app.db.models import UsageEvent
from app.db.session import SessionLocal


def _auth_header(token: str) -> dict[str, str]:
    return {'Authorization': f'Bearer {token}'}


def _register_and_token(client) -> str:
    payload = {
        'email': 'chat-owner@example.com',
        'password': 'StrongPass123',
        'full_name': 'Chat Owner',
        'organization_name': 'Chat Org',
    }
    res = client.post('/api/v1/auth/register', json=payload)
    assert res.status_code == 200, res.text
    return res.json()['tokens']['access_token']


def _create_assistant(client, headers: dict[str, str]) -> int:
    res = client.post(
        '/api/v1/assistants',
        headers=headers,
        json={
            'name': 'ЮристЧат',
            'description': 'Тестовый чат-ассистент',
            'system_prompt': 'Ты отвечаешь строго по фактам из базы знаний.',
            'model_name': 'mvp-model',
        },
    )
    assert res.status_code == 200, res.text
    return res.json()['id']


def _create_knowledge_base_with_doc(client, headers: dict[str, str], assistant_id: int) -> int:
    kb_res = client.post(
        f'/api/v1/assistants/{assistant_id}/knowledge-bases',
        headers=headers,
        json={'name': 'Правила NDA', 'chunk_size': 120, 'chunk_overlap': 20},
    )
    assert kb_res.status_code == 200, kb_res.text
    kb_id = kb_res.json()['id']

    file_content = (
        'NDA предусматривает ответственность за разглашение. '
        'Штраф составляет 500 000 рублей в случае нарушения. '
        'Срок действия соглашения два года. '
    ) * 8

    upload = client.post(
        f'/api/v1/knowledge-bases/{kb_id}/documents/upload',
        headers=headers,
        files={
            'file': ('nda.txt', file_content.encode('utf-8'), 'text/plain'),
        },
    )
    assert upload.status_code == 200, upload.text
    return kb_id


def test_chat_runtime_conversation_retry_close(client) -> None:
    token = _register_and_token(client)
    headers = _auth_header(token)

    assistant_id = _create_assistant(client, headers)
    _create_knowledge_base_with_doc(client, headers, assistant_id)

    chat_payload = {
        'message': 'Какая ответственность за разглашение NDA?',
        'user_external_id': 'customer-42',
        'channel_type': 'web',
    }
    chat_res = client.post(f'/api/v1/assistants/{assistant_id}/chat', headers=headers, json=chat_payload)
    assert chat_res.status_code == 200, chat_res.text
    chat_data = chat_res.json()

    assert chat_data['assistant_message']['role'] == 'assistant'
    assert 'На основе базы знаний' in chat_data['assistant_message']['content']
    assert len(chat_data['retrieved_chunks']) >= 1

    conversation_id = chat_data['conversation']['id']
    assert chat_data['conversation']['status'] == 'active'

    list_conv = client.get(f'/api/v1/assistants/{assistant_id}/conversations', headers=headers)
    assert list_conv.status_code == 200, list_conv.text
    conversations = list_conv.json()
    assert len(conversations) == 1
    assert conversations[0]['id'] == conversation_id

    list_messages = client.get(f'/api/v1/conversations/{conversation_id}/messages', headers=headers)
    assert list_messages.status_code == 200, list_messages.text
    messages = list_messages.json()
    assert len(messages) == 2
    assert messages[0]['role'] == 'user'
    assert messages[1]['role'] == 'assistant'

    retry_res = client.post(f'/api/v1/conversations/{conversation_id}/retry', headers=headers)
    assert retry_res.status_code == 200, retry_res.text
    retry_data = retry_res.json()
    assert retry_data['assistant_message']['metadata']['retried'] is True

    close_res = client.post(f'/api/v1/conversations/{conversation_id}/close', headers=headers)
    assert close_res.status_code == 200, close_res.text
    assert close_res.json()['status'] == 'closed'

    chat_closed_res = client.post(
        f'/api/v1/assistants/{assistant_id}/chat',
        headers=headers,
        json={
            'message': 'Попробуем снова',
            'conversation_id': conversation_id,
            'user_external_id': 'customer-42',
            'channel_type': 'web',
        },
    )
    assert chat_closed_res.status_code == 400, chat_closed_res.text
    assert chat_closed_res.json()['error_code'] == 'conversation_closed'

    with SessionLocal() as session:
        usage_count = session.execute(
            select(func.count(UsageEvent.id)).where(UsageEvent.conversation_id == conversation_id)
        ).scalar_one()
        assert usage_count >= 2

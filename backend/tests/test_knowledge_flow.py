from __future__ import annotations


def _auth_header(token: str) -> dict[str, str]:
    return {'Authorization': f'Bearer {token}'}


def _register_and_token(client) -> str:
    payload = {
        'email': 'kb-owner@example.com',
        'password': 'StrongPass123',
        'full_name': 'KB Owner',
        'organization_name': 'KB Org',
    }
    res = client.post('/api/v1/auth/register', json=payload)
    assert res.status_code == 200, res.text
    return res.json()['tokens']['access_token']


def _create_assistant(client, headers: dict[str, str]) -> int:
    res = client.post(
        '/api/v1/assistants',
        headers=headers,
        json={
            'name': 'БазаЗнаний-Бот',
            'description': 'Для теста KB',
            'system_prompt': 'Ты помощник по документам',
        },
    )
    assert res.status_code == 200, res.text
    return res.json()['id']


def test_knowledge_base_upload_and_reindex(client) -> None:
    token = _register_and_token(client)
    headers = _auth_header(token)
    assistant_id = _create_assistant(client, headers)

    kb_create = client.post(
        f'/api/v1/assistants/{assistant_id}/knowledge-bases',
        headers=headers,
        json={
            'name': 'Юридические документы',
            'description': 'Набор тестовых файлов',
            'chunk_size': 120,
            'chunk_overlap': 20,
        },
    )
    assert kb_create.status_code == 200, kb_create.text
    kb = kb_create.json()
    kb_id = kb['id']

    kb_get = client.get(f'/api/v1/knowledge-bases/{kb_id}', headers=headers)
    assert kb_get.status_code == 200, kb_get.text
    assert kb_get.json()['name'] == 'Юридические документы'

    file_content = (
        'Договор аренды помещения между сторонами. '\
        'Срок действия договора 12 месяцев. '\
        'Ответственность сторон определяется разделом 5. '
    ) * 12

    upload = client.post(
        f'/api/v1/knowledge-bases/{kb_id}/documents/upload',
        headers=headers,
        files={
            'file': ('agreement.txt', file_content.encode('utf-8'), 'text/plain'),
        },
    )
    assert upload.status_code == 200, upload.text
    document = upload.json()
    assert document['parse_status'] == 'ready'
    assert document['indexing_status'] == 'ready'
    assert document['chunks_count'] > 1
    document_id = document['id']

    list_docs = client.get(f'/api/v1/knowledge-bases/{kb_id}/documents', headers=headers)
    assert list_docs.status_code == 200, list_docs.text
    docs = list_docs.json()
    assert len(docs) == 1

    reindex = client.post(
        f'/api/v1/documents/{document_id}/reindex',
        headers=headers,
        json={
            'chunk_size': 100,
            'chunk_overlap': 10,
        },
    )
    assert reindex.status_code == 200, reindex.text
    reindexed = reindex.json()
    assert reindexed['chunks_count'] >= document['chunks_count']

    delete_doc = client.delete(f'/api/v1/documents/{document_id}', headers=headers)
    assert delete_doc.status_code == 200, delete_doc.text

    list_after_delete = client.get(f'/api/v1/knowledge-bases/{kb_id}/documents', headers=headers)
    assert list_after_delete.status_code == 200, list_after_delete.text
    assert list_after_delete.json() == []

    delete_kb = client.delete(f'/api/v1/knowledge-bases/{kb_id}', headers=headers)
    assert delete_kb.status_code == 200, delete_kb.text

    list_kb = client.get(f'/api/v1/assistants/{assistant_id}/knowledge-bases', headers=headers)
    assert list_kb.status_code == 200, list_kb.text
    assert list_kb.json() == []

from __future__ import annotations


def test_register_and_me_flow(client) -> None:
    register_payload = {
        'email': 'owner@example.com',
        'password': 'StrongPass123',
        'full_name': 'Owner User',
        'organization_name': 'Юр команда',
    }

    register_res = client.post('/api/v1/auth/register', json=register_payload)
    assert register_res.status_code == 200, register_res.text

    data = register_res.json()
    assert data['user']['email'] == 'owner@example.com'
    assert data['organization_role'] == 'owner'
    assert data['organization_id'] > 0
    assert data['tokens']['access_token']
    assert data['tokens']['refresh_token']

    access_token = data['tokens']['access_token']
    refresh_token = data['tokens']['refresh_token']

    me_res = client.get('/api/v1/auth/me', headers={'Authorization': f'Bearer {access_token}'})
    assert me_res.status_code == 200, me_res.text
    me_data = me_res.json()
    assert me_data['organization_name'] == 'Юр команда'
    assert me_data['organization_role'] == 'owner'

    refresh_res = client.post('/api/v1/auth/refresh', json={'refresh_token': refresh_token})
    assert refresh_res.status_code == 200, refresh_res.text
    refreshed = refresh_res.json()
    assert refreshed['tokens']['refresh_token'] != refresh_token

    logout_res = client.post('/api/v1/auth/logout', json={'refresh_token': refreshed['tokens']['refresh_token']})
    assert logout_res.status_code == 200, logout_res.text
    assert logout_res.json()['status'] == 'ok'

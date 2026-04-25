from __future__ import annotations

from sqlalchemy import text

from app.db.session import SessionLocal


def database_ping() -> dict[str, str]:
    with SessionLocal() as db:
        db.execute(text('SELECT 1'))
    return {'status': 'ok'}

from fastapi import APIRouter, Depends
from redis import Redis
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db

router = APIRouter(prefix='/health', tags=['health'])


@router.get('/live')
def live() -> dict:
    return {'status': 'ok'}


@router.get('/ready')
def ready(db: Session = Depends(get_db)) -> dict:
    settings = get_settings()
    db_ok = False
    redis_ok = False

    try:
        db.execute(text('SELECT 1'))
        db_ok = True
    except Exception:
        db_ok = False

    try:
        client = Redis.from_url(settings.redis_url)
        redis_ok = bool(client.ping())
    except Exception:
        redis_ok = False

    status = 'ok' if db_ok and redis_ok else 'degraded'
    return {
        'status': status,
        'checks': {
            'database': db_ok,
            'redis': redis_ok,
        },
    }

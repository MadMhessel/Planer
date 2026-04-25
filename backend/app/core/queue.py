from __future__ import annotations

from collections.abc import Callable
from typing import Any

from redis import Redis
from rq import Queue

from app.core.config import get_settings


def redis_connection() -> Redis:
    return Redis.from_url(get_settings().redis_url)


def queue(name: str = 'default') -> Queue:
    return Queue(name=name, connection=redis_connection())


def enqueue_job(func: Callable[..., Any], *args: Any, queue_name: str = 'default', **kwargs: Any):
    return queue(queue_name).enqueue(func, *args, **kwargs)

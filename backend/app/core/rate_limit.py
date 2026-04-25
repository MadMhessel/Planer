from __future__ import annotations

import time
from collections import defaultdict, deque
from collections.abc import Callable
from threading import Lock

from fastapi import Request

from app.core.errors import APIError

_rate_limit_state: dict[str, deque[float]] = defaultdict(deque)
_rate_limit_lock = Lock()


def rate_limit(limit: int, window_seconds: int) -> Callable[[Request], None]:
    def dependency(request: Request) -> None:
        ip = request.client.host if request.client else 'unknown'
        key = f'{request.url.path}:{ip}'
        now = time.time()

        with _rate_limit_lock:
            bucket = _rate_limit_state[key]
            while bucket and bucket[0] <= now - window_seconds:
                bucket.popleft()

            if len(bucket) >= limit:
                raise APIError(
                    status_code=429,
                    error_code='rate_limited',
                    message='Слишком много запросов, попробуйте позже',
                )

            bucket.append(now)

    return dependency

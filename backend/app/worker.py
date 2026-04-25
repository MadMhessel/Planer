from __future__ import annotations

import logging

from rq import Worker

from app.core.config import get_settings
from app.core.queue import redis_connection


def main() -> None:
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s %(message)s')
    settings = get_settings()
    worker = Worker(settings.queue_name_list, connection=redis_connection())
    worker.work(with_scheduler=True)


if __name__ == '__main__':
    main()

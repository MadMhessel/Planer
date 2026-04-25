.PHONY: up down logs install migrate test run worker prod-up prod-down prod-logs prod-migrate prod-backup

up:
	docker compose up -d postgres redis

down:
	docker compose down

logs:
	docker compose logs -f

install:
	python3.12 -m venv .venv
	. .venv/bin/activate && pip install -r requirements.txt

migrate:
	alembic upgrade head

run:
	uvicorn app.main:app --reload --port 8000

worker:
	python -m app.worker

test:
	pytest -q

prod-up:
	docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

prod-down:
	docker compose --env-file .env.production -f docker-compose.prod.yml down

prod-logs:
	docker compose --env-file .env.production -f docker-compose.prod.yml logs -f

prod-migrate:
	docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api alembic upgrade head

prod-backup:
	./infra/backup-postgres.sh

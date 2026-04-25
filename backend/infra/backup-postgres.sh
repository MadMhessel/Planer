#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-ai_backend}" "${POSTGRES_DB:-ai_backend}" \
  > "$BACKUP_DIR/postgres-$TIMESTAMP.sql"

find "$BACKUP_DIR" -type f -name 'postgres-*.sql' -mtime +14 -delete

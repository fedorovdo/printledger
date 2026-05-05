#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  echo "Usage: ./scripts/restore_db.sh backups/printledger_backup_YYYY-MM-DD_HH-mm-ss.dump"
  echo "Restores PostgreSQL database from a custom-format pg_dump file. This overwrites the current database."
  exit 0
fi

if [ $# -ne 1 ]; then
  echo "Backup file is required. Use --help for usage." >&2
  exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-printledger}"
POSTGRES_DB="${POSTGRES_DB:-printledger}"

echo "Restore will overwrite database '$POSTGRES_DB'."
printf "Type YES to continue: "
read -r CONFIRMATION
if [ "$CONFIRMATION" != "YES" ]; then
  echo "Restore cancelled."
  exit 0
fi

docker compose exec -T postgres dropdb -U "$POSTGRES_USER" "$POSTGRES_DB" --if-exists
docker compose exec -T postgres createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < "$BACKUP_FILE"

echo "Restore completed from: $BACKUP_FILE"
echo "Recommended next step: docker compose exec backend alembic upgrade head"

#!/usr/bin/env bash
# Restore a dump produced by backup.sh into the compose database (or DATABASE_URL), then verify it.
#
#   scripts/restore.sh                          # newest dump in backups/
#   scripts/restore.sh backups/assetcare-20260916-120000.sql.gz
#
# The target database is dropped and recreated. That is the point of a restore test; do not point this at production
# without reading docs/operations/BACKUP-RESTORE.md.
set -euo pipefail

DIR="${BACKUP_DIR:-$(cd "$(dirname "$0")/.." && pwd)/backups}"
FILE="${1:-$(ls -1t "$DIR"/assetcare-*.sql.gz 2>/dev/null | head -1)}"
[[ -f "$FILE" ]] || { echo "no dump found (looked for $FILE)"; exit 1; }
if [[ -f "$FILE.sha256" ]]; then
  (cd "$(dirname "$FILE")" && (sha256sum -c "$(basename "$FILE").sha256" >/dev/null 2>&1 || shasum -a 256 -c "$(basename "$FILE").sha256" >/dev/null)) && echo "checksum ok"
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
  gunzip -c "$FILE" | psql --set ON_ERROR_STOP=1 --quiet "$DATABASE_URL"
else
  docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -q -c "DROP DATABASE IF EXISTS ${POSTGRES_DB}_restore" -c "CREATE DATABASE ${POSTGRES_DB}_restore"'
  gunzip -c "$FILE" | docker compose exec -T postgres sh -c 'psql --set ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d "${POSTGRES_DB}_restore"'
  # swap: the restored database becomes the live one, the old one is kept as _previous for one more cycle
  docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -q \
     -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '"'"'${POSTGRES_DB}'"'"' AND pid <> pg_backend_pid()" \
     -c "DROP DATABASE IF EXISTS ${POSTGRES_DB}_previous" \
     -c "ALTER DATABASE ${POSTGRES_DB} RENAME TO ${POSTGRES_DB}_previous" \
     -c "ALTER DATABASE ${POSTGRES_DB}_restore RENAME TO ${POSTGRES_DB}"'
fi

# verify: the schema is there and the changelog is complete
if [[ -n "${DATABASE_URL:-}" ]]; then
  psql -tA "$DATABASE_URL" -c "select count(*) from databasechangelog"
else
  docker compose exec -T postgres sh -c 'psql -tA -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) || '"'"' changesets, '"'"' || (select count(*) from asset) || '"'"' assets'"'"' from databasechangelog"'
fi
echo "restored from $FILE"

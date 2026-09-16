#!/usr/bin/env bash
# Dump the AssetCare PostgreSQL database: timestamped, compressed, with retention, optionally uploaded to object storage.
#
#   scripts/backup.sh                       # compose database → backups/assetcare-YYYYmmdd-HHMMSS.sql.gz
#   DATABASE_URL=postgres://u:p@host/db scripts/backup.sh     # any PostgreSQL
#   BACKUP_S3_BUCKET=my-bucket scripts/backup.sh              # also upload with the AWS CLI (OCI Object Storage S3 API)
#
# Retention: BACKUP_KEEP (default 14) newest local dumps are kept.
set -euo pipefail

DIR="${BACKUP_DIR:-$(cd "$(dirname "$0")/.." && pwd)/backups}"
KEEP="${BACKUP_KEEP:-14}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
FILE="$DIR/assetcare-$STAMP.sql.gz"
mkdir -p "$DIR"

if [[ -n "${DATABASE_URL:-}" ]]; then
  pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip -9 > "$FILE"
else
  # the compose container; credentials come from the container's environment, nothing is typed here
  docker compose exec -T postgres sh -c 'pg_dump --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip -9 > "$FILE"
fi

SIZE=$(du -h "$FILE" | cut -f1)
echo "backup written: $FILE ($SIZE)"
sha256sum "$FILE" > "$FILE.sha256" 2>/dev/null || shasum -a 256 "$FILE" > "$FILE.sha256"

if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
  aws s3 cp "$FILE" "s3://$BACKUP_S3_BUCKET/assetcare/$(basename "$FILE")" ${BACKUP_S3_ENDPOINT:+--endpoint-url "$BACKUP_S3_ENDPOINT"}
  aws s3 cp "$FILE.sha256" "s3://$BACKUP_S3_BUCKET/assetcare/$(basename "$FILE").sha256" ${BACKUP_S3_ENDPOINT:+--endpoint-url "$BACKUP_S3_ENDPOINT"}
  echo "uploaded to s3://$BACKUP_S3_BUCKET/assetcare/"
fi

# retention: keep the newest $KEEP dumps
ls -1t "$DIR"/assetcare-*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do rm -f "$old" "$old.sha256"; echo "removed old backup: $old"; done

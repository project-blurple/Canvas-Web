#!/usr/bin/env bash
# Creates a schema-only backup (DDL only, no table rows).
set -euo pipefail

: "${PGHOST:?PGHOST is required}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${PGDATABASE:?PGDATABASE is required}"

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "${BACKUP_DIR}"

ts="$(date +%F_%H-%M-%S)"
out="${BACKUP_DIR}/db-schema-${ts}.sql"

pg_dump \
  --host="${PGHOST}" \
  --port="${PGPORT}" \
  --username="${PGUSER}" \
  --dbname="${PGDATABASE}" \
  --schema-only \
  --format=plain \
  --encoding=UTF8 \
  --no-owner \
  --no-privileges \
  --file="${out}"

gzip -f "${out}"
echo "$(date -Is) Backup created: ${out}.gz"

find "${BACKUP_DIR}" -type f -name "db-*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete || true

#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:?PGHOST is required}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${PGDATABASE:?PGDATABASE is required}"

BACKUP_DIR="${BACKUP_DIR:-/backups}"
STATE_DIR="${STATE_DIR:-/state}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DATA_INTERVAL_MINUTES="${DATA_INTERVAL_MINUTES:-480}"
SCHEMA_INTERVAL_MINUTES="${SCHEMA_INTERVAL_MINUTES:-1440}"
FULL_INTERVAL_MINUTES="${FULL_INTERVAL_MINUTES:-1440}"
LOOP_SLEEP_SECONDS="${LOOP_SLEEP_SECONDS:-30}"
RUN_DATA_ON_START="${RUN_DATA_ON_START:-true}"
RUN_SCHEMA_ON_START="${RUN_SCHEMA_ON_START:-false}"
RUN_FULL_ON_START="${RUN_FULL_ON_START:-false}"

mkdir -p "${BACKUP_DIR}" "${STATE_DIR}"
export TZ="${TZ:-UTC}"

if ! [[ "${DATA_INTERVAL_MINUTES}" =~ ^[0-9]+$ ]] || [ "${DATA_INTERVAL_MINUTES}" -le 0 ]; then
  echo "DATA_INTERVAL_MINUTES must be a positive integer." >&2
  exit 1
fi

if ! [[ "${SCHEMA_INTERVAL_MINUTES}" =~ ^[0-9]+$ ]] || [ "${SCHEMA_INTERVAL_MINUTES}" -le 0 ]; then
  echo "SCHEMA_INTERVAL_MINUTES must be a positive integer." >&2
  exit 1
fi

if ! [[ "${FULL_INTERVAL_MINUTES}" =~ ^[0-9]+$ ]] || [ "${FULL_INTERVAL_MINUTES}" -le 0 ]; then
  echo "FULL_INTERVAL_MINUTES must be a positive integer." >&2
  exit 1
fi

run_backup() {
  local mode="$1"
  local ts
  local out

  ts="$(date +%F_%H-%M-%S)"

  if [ "${mode}" = "data" ]; then
    out="${BACKUP_DIR}/db-data-${ts}.sql"
    pg_dump \
      --host="${PGHOST}" \
      --port="${PGPORT}" \
      --username="${PGUSER}" \
      --dbname="${PGDATABASE}" \
      --data-only \
      --format=plain \
      --encoding=UTF8 \
      --disable-triggers \
      --file="${out}"
  elif [ "${mode}" = "schema" ]; then
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
  else
    out="${BACKUP_DIR}/db-full-${ts}.sql"
    pg_dump \
      --host="${PGHOST}" \
      --port="${PGPORT}" \
      --username="${PGUSER}" \
      --dbname="${PGDATABASE}" \
      --format=plain \
      --encoding=UTF8 \
      --no-owner \
      --no-privileges \
      --file="${out}"
  fi

  gzip -f "${out}"
  echo "$(date -Is) Backup created: ${out}.gz"

  find "${BACKUP_DIR}" -type f -name "db-*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete || true
}

echo "Starting backup loop with DATA_INTERVAL_MINUTES=${DATA_INTERVAL_MINUTES}, SCHEMA_INTERVAL_MINUTES=${SCHEMA_INTERVAL_MINUTES}, FULL_INTERVAL_MINUTES=${FULL_INTERVAL_MINUTES}, TZ=${TZ:-UTC}"

if [ "${RUN_DATA_ON_START}" = "true" ]; then
  run_backup data
  date +%s > "${STATE_DIR}/last_data_epoch"
fi

if [ "${RUN_SCHEMA_ON_START}" = "true" ]; then
  run_backup schema
  date +%s > "${STATE_DIR}/last_schema_epoch"
fi

if [ "${RUN_FULL_ON_START}" = "true" ]; then
  run_backup full
  date +%s > "${STATE_DIR}/last_full_epoch"
  date +%s > "${STATE_DIR}/last_data_epoch"
fi

while true; do
  now_epoch="$(date +%s)"

  last_full_epoch="$(cat "${STATE_DIR}/last_full_epoch" 2>/dev/null || echo 0)"
  full_interval_seconds=$((FULL_INTERVAL_MINUTES * 60))
  if [ $((now_epoch - last_full_epoch)) -ge "${full_interval_seconds}" ]; then
    run_backup full
    printf '%s\n' "${now_epoch}" > "${STATE_DIR}/last_full_epoch"
    # A full backup replaces a data-only run when both are due.
    printf '%s\n' "${now_epoch}" > "${STATE_DIR}/last_data_epoch"
  fi

  last_schema_epoch="$(cat "${STATE_DIR}/last_schema_epoch" 2>/dev/null || echo 0)"
  schema_interval_seconds=$((SCHEMA_INTERVAL_MINUTES * 60))
  if [ $((now_epoch - last_schema_epoch)) -ge "${schema_interval_seconds}" ]; then
    run_backup schema
    printf '%s\n' "${now_epoch}" > "${STATE_DIR}/last_schema_epoch"
  fi

  last_data_epoch="$(cat "${STATE_DIR}/last_data_epoch" 2>/dev/null || echo 0)"
  data_interval_seconds=$((DATA_INTERVAL_MINUTES * 60))
  if [ $((now_epoch - last_data_epoch)) -ge "${data_interval_seconds}" ]; then
    run_backup data
    printf '%s\n' "${now_epoch}" > "${STATE_DIR}/last_data_epoch"
  fi

  sleep "${LOOP_SLEEP_SECONDS}"
done

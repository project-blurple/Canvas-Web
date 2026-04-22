#!/usr/bin/env bash
# Continuous PostgreSQL backup runner for containerized deployment.
set -euo pipefail

: "${PGHOST:?PGHOST is required}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${PGDATABASE:?PGDATABASE is required}"

BACKUP_DIR="${BACKUP_DIR:-/backups}"
STATE_DIR="${STATE_DIR:-/state}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
UNLOCKED_INTERVAL_MINUTES="${UNLOCKED_INTERVAL_MINUTES:-${DATA_INTERVAL_MINUTES:-480}}"
FULL_INTERVAL_MINUTES="${FULL_INTERVAL_MINUTES:-2880}"
LOOP_SLEEP_SECONDS="${LOOP_SLEEP_SECONDS:-30}"
RUN_UNLOCKED_ON_START="${RUN_UNLOCKED_ON_START:-${RUN_DATA_ON_START:-true}}"
RUN_FULL_ON_START="${RUN_FULL_ON_START:-false}"
RUN_SCHEMA_WITH_FULL="${RUN_SCHEMA_WITH_FULL:-true}"

mkdir -p "${BACKUP_DIR}" "${STATE_DIR}"
export TZ="${TZ:-UTC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! [[ "${UNLOCKED_INTERVAL_MINUTES}" =~ ^[0-9]+$ ]] || [ "${UNLOCKED_INTERVAL_MINUTES}" -le 0 ]; then
  echo "UNLOCKED_INTERVAL_MINUTES must be a positive integer." >&2
  exit 1
fi

if ! [[ "${FULL_INTERVAL_MINUTES}" =~ ^[0-9]+$ ]] || [ "${FULL_INTERVAL_MINUTES}" -le 0 ]; then
  echo "FULL_INTERVAL_MINUTES must be a positive integer." >&2
  exit 1
fi

if ! [[ "${LOOP_SLEEP_SECONDS}" =~ ^[0-9]+$ ]] || [ "${LOOP_SLEEP_SECONDS}" -le 0 ]; then
  echo "LOOP_SLEEP_SECONDS must be a positive integer." >&2
  exit 1
fi

run_full_backup() {
  "${SCRIPT_DIR}/backup-full.sh"
}

run_schema_backup() {
  "${SCRIPT_DIR}/backup-schema.sh"
}

run_unlocked_backup() {
  "${SCRIPT_DIR}/backup-unlocked.sh"
}

echo "Starting backup loop with UNLOCKED_INTERVAL_MINUTES=${UNLOCKED_INTERVAL_MINUTES}, FULL_INTERVAL_MINUTES=${FULL_INTERVAL_MINUTES}, RUN_SCHEMA_WITH_FULL=${RUN_SCHEMA_WITH_FULL}, TZ=${TZ:-UTC}"

if [ "${RUN_UNLOCKED_ON_START}" = "true" ]; then
  run_unlocked_backup
  date +%s > "${STATE_DIR}/last_unlocked_epoch"
fi

if [ "${RUN_FULL_ON_START}" = "true" ]; then
  if [ "${RUN_SCHEMA_WITH_FULL}" = "true" ]; then
    run_full_backup &
    full_pid=$!
    run_schema_backup &
    schema_pid=$!
    wait "${full_pid}"
    wait "${schema_pid}"
  else
    run_full_backup
  fi
  date +%s > "${STATE_DIR}/last_full_epoch"
  date +%s > "${STATE_DIR}/last_unlocked_epoch"
fi

while true; do
  now_epoch="$(date +%s)"

  last_full_epoch="$(cat "${STATE_DIR}/last_full_epoch" 2>/dev/null || echo 0)"
  full_interval_seconds=$((FULL_INTERVAL_MINUTES * 60))
  if [ $((now_epoch - last_full_epoch)) -ge "${full_interval_seconds}" ]; then
    if [ "${RUN_SCHEMA_WITH_FULL}" = "true" ]; then
      run_full_backup &
      full_pid=$!
      run_schema_backup &
      schema_pid=$!
      wait "${full_pid}"
      wait "${schema_pid}"
    else
      run_full_backup
    fi
    printf '%s\n' "${now_epoch}" > "${STATE_DIR}/last_full_epoch"
    printf '%s\n' "${now_epoch}" > "${STATE_DIR}/last_unlocked_epoch"
  fi

  last_unlocked_epoch="$(cat "${STATE_DIR}/last_unlocked_epoch" 2>/dev/null || echo 0)"
  unlocked_interval_seconds=$((UNLOCKED_INTERVAL_MINUTES * 60))
  if [ $((now_epoch - last_unlocked_epoch)) -ge "${unlocked_interval_seconds}" ]; then
    run_unlocked_backup
    printf '%s\n' "${now_epoch}" > "${STATE_DIR}/last_unlocked_epoch"
  fi

  sleep "${LOOP_SLEEP_SECONDS}"
done

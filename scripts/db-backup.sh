#!/usr/bin/env bash
# Continuous PostgreSQL backup runner for containerized deployment.
#
# This script is designed to run as the container entrypoint and stay alive.
# It creates three backup styles:
# 1) Full database backup (schema + all data)
# 2) Schema-only backup (run in parallel with full when enabled)
# 3) Unlocked-canvas-only data backup (targeted, lower-churn snapshot)
#
# Scheduling is interval-based and driven entirely by environment variables.
# State files are persisted under STATE_DIR so schedule timing survives restarts
# when that directory is backed by a host volume.
set -euo pipefail

# Required connection settings. PGPASSWORD is read by psql/pg_dump automatically.
: "${PGHOST:?PGHOST is required}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${PGDATABASE:?PGDATABASE is required}"

# BACKUP_DIR: Where generated backup artifacts are written.
# STATE_DIR: Stores last-run timestamps for each backup lane.
# RETENTION_DAYS: Delete compressed backups older than this many days.
BACKUP_DIR="${BACKUP_DIR:-/backups}"
STATE_DIR="${STATE_DIR:-/state}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# UNLOCKED_INTERVAL_MINUTES:
# - Frequency for unlocked-canvas incremental backups.
# - Falls back to legacy DATA_INTERVAL_MINUTES for compatibility.
UNLOCKED_INTERVAL_MINUTES="${UNLOCKED_INTERVAL_MINUTES:-${DATA_INTERVAL_MINUTES:-480}}"

# FULL_INTERVAL_MINUTES:
# - Frequency for full backups.
# - Default is 2880 minutes (48 hours).
FULL_INTERVAL_MINUTES="${FULL_INTERVAL_MINUTES:-2880}"

# Loop sleep controls scheduler resolution.
# Lower values = more precise timing but slightly higher wake-up overhead.
LOOP_SLEEP_SECONDS="${LOOP_SLEEP_SECONDS:-30}"

# Startup behavior flags.
# RUN_UNLOCKED_ON_START: Perform an unlocked snapshot immediately on boot.
# RUN_FULL_ON_START: Perform full (and optionally schema) immediately on boot.
# RUN_SCHEMA_WITH_FULL: When true, full and schema backups run concurrently.
RUN_UNLOCKED_ON_START="${RUN_UNLOCKED_ON_START:-${RUN_DATA_ON_START:-true}}"
RUN_FULL_ON_START="${RUN_FULL_ON_START:-false}"
RUN_SCHEMA_WITH_FULL="${RUN_SCHEMA_WITH_FULL:-true}"

# Ensure output/state locations exist and configure local timezone for logs.
mkdir -p "${BACKUP_DIR}" "${STATE_DIR}"
export TZ="${TZ:-UTC}"

# Validate scheduler settings early so misconfiguration fails fast.
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

# Full backup lane:
# - Uses pg_dump in plain SQL mode.
# - Includes schema + all rows.
# - Compressed to .sql.gz to save space.
# - Runs retention cleanup after completion.
run_full_backup() {
  local ts
  local out

  ts="$(date +%F_%H-%M-%S)"
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

  gzip -f "${out}"
  echo "$(date -Is) Backup created: ${out}.gz"

  find "${BACKUP_DIR}" -type f -name "db-*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete || true
}

# Schema backup lane:
# - Captures DDL (tables, indexes, constraints, views, functions, etc.).
# - No table row data included.
# - Usually paired with full backups for quick schema audit/history.
run_schema_backup() {
  local ts
  local out

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
}

# Unlocked-canvas backup lane:
# - Captures only rows for canvases currently unlocked.
# - Intended for frequent snapshots because unlocked canvas data changes often.
# - Builds a SQL file with COPY blocks to stay compatible with your restore style.
run_unlocked_backup() {
  local ts
  local out
  local unlocked_canvas_ids
  local cols

  ts="$(date +%F_%H-%M-%S)"
  out="${BACKUP_DIR}/db-unlocked-${ts}.sql"

  # Gather unlocked canvas IDs as a comma-separated list (e.g. 1,2,3).
  # Empty string means there are currently no unlocked canvases.
  unlocked_canvas_ids="$(psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" -At -v ON_ERROR_STOP=1 -c "SELECT COALESCE(string_agg(id::text, ',' ORDER BY id), '') FROM public.canvas WHERE locked = false")"

  # Write a psql-friendly header for readability and restore consistency.
  {
    echo "-- Unlocked-canvas data backup"
    echo "-- Generated at $(date -Is)"
    echo "SET statement_timeout = 0;"
    echo "SET lock_timeout = 0;"
    echo "SET idle_in_transaction_session_timeout = 0;"
    echo "SET client_encoding = 'UTF8';"
    echo "SET standard_conforming_strings = on;"
    echo "SELECT pg_catalog.set_config('search_path', '', false);"
    echo "SET check_function_bodies = false;"
    echo "SET xmloption = content;"
    echo "SET client_min_messages = warning;"
    echo "SET row_security = off;"
    echo
  } > "${out}"

  # If no unlocked canvases exist, still write a valid artifact to show the run
  # happened and preserve timing/state behavior.
  if [ -z "${unlocked_canvas_ids}" ]; then
    echo "-- No unlocked canvases found at backup time." >> "${out}"
    gzip -f "${out}"
    echo "$(date -Is) Backup created (empty unlocked snapshot): ${out}.gz"
    find "${BACKUP_DIR}" -type f -name "db-*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete || true
    return
  fi

  # Defensive check: ensure we only use numeric IDs in dynamic SQL.
  if ! [[ "${unlocked_canvas_ids}" =~ ^[0-9]+(,[0-9]+)*$ ]]; then
    echo "Unlocked canvas ID list has unexpected format: ${unlocked_canvas_ids}" >&2
    exit 1
  fi

  # Helper to append one COPY block for a table with a filtered WHERE clause.
  # We dynamically resolve column order from information_schema so COPY output
  # remains aligned with the current table definition.
  append_copy_block() {
    local table="$1"
    local where_clause="$2"

    cols="$(psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" -At -v ON_ERROR_STOP=1 -c "SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}'")"
    if [ -z "${cols}" ]; then
      echo "Could not resolve columns for table ${table}" >&2
      exit 1
    fi

    # COPY ... FROM stdin block format:
    # COPY public.table(col1, col2, ...) FROM stdin;
    # <tab-delimited rows>
    # \.
    {
      echo
      echo "COPY public.${table} (${cols}) FROM stdin;"
      psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" -v ON_ERROR_STOP=1 -c "COPY (SELECT ${cols} FROM public.${table} WHERE ${where_clause}) TO STDOUT"
      echo "\\."
    } >> "${out}"
  }

  # Table coverage for unlocked snapshot.
  # canvas: source of unlocked IDs.
  # pixel/history/cooldown/frame: high-churn canvas-scoped data.
  append_copy_block "canvas" "id IN (${unlocked_canvas_ids})"
  append_copy_block "pixel" "canvas_id IN (${unlocked_canvas_ids})"
  append_copy_block "history" "canvas_id IN (${unlocked_canvas_ids})"
  append_copy_block "cooldown" "canvas_id IN (${unlocked_canvas_ids})"
  append_copy_block "frame" "canvas_id IN (${unlocked_canvas_ids})"

  gzip -f "${out}"
  echo "$(date -Is) Backup created: ${out}.gz"

  find "${BACKUP_DIR}" -type f -name "db-*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete || true
}

# Log effective runtime schedule at startup for observability in container logs.
echo "Starting backup loop with UNLOCKED_INTERVAL_MINUTES=${UNLOCKED_INTERVAL_MINUTES}, FULL_INTERVAL_MINUTES=${FULL_INTERVAL_MINUTES}, RUN_SCHEMA_WITH_FULL=${RUN_SCHEMA_WITH_FULL}, TZ=${TZ:-UTC}"

# Optional immediate unlocked snapshot on container start.
if [ "${RUN_UNLOCKED_ON_START}" = "true" ]; then
  run_unlocked_backup
  # Record timestamp so interval cadence starts from this successful run.
  date +%s > "${STATE_DIR}/last_unlocked_epoch"
fi

# Optional immediate full cycle on container start.
# If RUN_SCHEMA_WITH_FULL=true, full and schema backups run in parallel.
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
  # Full backup satisfies the unlocked lane for this cycle.
  date +%s > "${STATE_DIR}/last_unlocked_epoch"
fi

# Main scheduler loop.
# Order of checks matters:
# 1) Full lane first
# 2) Unlocked lane second
# This allows a due full backup to supersede unlocked backup timing.
while true; do
  now_epoch="$(date +%s)"

  # Full backup lane due check.
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
    # A full backup replaces an unlocked-only backup when both are due.
    printf '%s\n' "${now_epoch}" > "${STATE_DIR}/last_unlocked_epoch"
  fi

  # Unlocked backup lane due check.
  last_unlocked_epoch="$(cat "${STATE_DIR}/last_unlocked_epoch" 2>/dev/null || echo 0)"
  unlocked_interval_seconds=$((UNLOCKED_INTERVAL_MINUTES * 60))
  if [ $((now_epoch - last_unlocked_epoch)) -ge "${unlocked_interval_seconds}" ]; then
    run_unlocked_backup
    printf '%s\n' "${now_epoch}" > "${STATE_DIR}/last_unlocked_epoch"
  fi

  # Sleep briefly to avoid tight-loop CPU usage.
  sleep "${LOOP_SLEEP_SECONDS}"
done

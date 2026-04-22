#!/usr/bin/env bash
# Continuous PostgreSQL backup runner for containerized deployment.
set -euo pipefail

: "${PGHOST:?PGHOST is required}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${PGDATABASE:?PGDATABASE is required}"

BACKUP_DIR=${BACKUP_DIR:-/backups}
STATE_DIR=${STATE_DIR:-/state}
RETENTION_DAYS=${RETENTION_DAYS:-14}
UNLOCKED_INTERVAL_MINUTES=${UNLOCKED_INTERVAL_MINUTES:-${DATA_INTERVAL_MINUTES:-480}}
FULL_INTERVAL_MINUTES=${FULL_INTERVAL_MINUTES:-2880}
LOOP_SLEEP_SECONDS=${LOOP_SLEEP_SECONDS:-30}
RUN_UNLOCKED_ON_START=${RUN_UNLOCKED_ON_START:-${RUN_DATA_ON_START:-true}}
RUN_FULL_ON_START=${RUN_FULL_ON_START:-false}
RUN_SCHEMA_WITH_FULL=${RUN_SCHEMA_WITH_FULL:-true}

mkdir -p "$BACKUP_DIR" "$STATE_DIR"
export TZ=${TZ:-UTC}

if ! [[ "$UNLOCKED_INTERVAL_MINUTES" =~ ^[0-9]+$ ]] || [ "$UNLOCKED_INTERVAL_MINUTES" -le 0 ]; then
  echo "UNLOCKED_INTERVAL_MINUTES must be a positive integer." >&2
  exit 1
fi

if ! [[ "$FULL_INTERVAL_MINUTES" =~ ^[0-9]+$ ]] || [ "$FULL_INTERVAL_MINUTES" -le 0 ]; then
  echo "FULL_INTERVAL_MINUTES must be a positive integer." >&2
  exit 1
fi

if ! [[ "$LOOP_SLEEP_SECONDS" =~ ^[0-9]+$ ]] || [ "$LOOP_SLEEP_SECONDS" -le 0 ]; then
  echo "LOOP_SLEEP_SECONDS must be a positive integer." >&2
  exit 1
fi

run_full_backup() {
  local ts out

  ts="$(date +%F_%H-%M-%S)"
  out="$BACKUP_DIR/db-full-$ts.sql"

  pg_dump \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="$PGDATABASE" \
    --format=plain \
    --encoding=UTF8 \
    --no-owner \
    --no-privileges \
    --file="$out"

  gzip -f "$out"
  echo "$(date -Is) Backup created: $out.gz"

  find "$BACKUP_DIR" -type f -name "db-*.sql.gz" -mtime +$RETENTION_DAYS -delete || true
}

run_schema_backup() {
  local ts out

  ts="$(date +%F_%H-%M-%S)"
  out="$BACKUP_DIR/db-schema-$ts.sql"

  pg_dump \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="$PGDATABASE" \
    --schema-only \
    --format=plain \
    --encoding=UTF8 \
    --no-owner \
    --no-privileges \
    --file="$out"

  gzip -f "$out"
  echo "$(date -Is) Backup created: $out.gz"

  find "$BACKUP_DIR" -type f -name "db-*.sql.gz" -mtime +$RETENTION_DAYS -delete || true
}

run_unlocked_backup() {
  local ts out unlocked_canvas_ids

  ts="$(date +%F_%H-%M-%S)"
  out="$BACKUP_DIR/db-unlocked-$ts.sql"

  unlocked_canvas_ids="$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -At -v ON_ERROR_STOP=1 -c "SELECT COALESCE(string_agg(id::text, ',' ORDER BY id), '') FROM public.canvas WHERE locked = false")"

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
  } > "$out"

  if [ -z "$unlocked_canvas_ids" ]; then
    echo "-- No unlocked canvases found at backup time." >> "$out"
    gzip -f "$out"
    echo "$(date -Is) Backup created (empty unlocked snapshot): $out.gz"
    find "$BACKUP_DIR" -type f -name "db-*.sql.gz" -mtime +$RETENTION_DAYS -delete || true
    return 0
  fi

  if ! [[ "$unlocked_canvas_ids" =~ ^[0-9]+(,[0-9]+)*$ ]]; then
    echo "Unlocked canvas ID list has unexpected format: $unlocked_canvas_ids" >&2
    return 1
  fi

  append_copy_block() {
    local table="$1"
    local where_clause="$2"
    local cols

    cols="$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -At -v ON_ERROR_STOP=1 -c "SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table'")"
    if [ -z "$cols" ]; then
      echo "Could not resolve columns for table $table" >&2
      return 1
    fi

    {
      echo
      echo "COPY public.$table ($cols) FROM stdin;"
      psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -c "COPY (SELECT $cols FROM public.$table WHERE $where_clause) TO STDOUT"
      echo "\\."
    } >> "$out"
  }

  append_copy_block "canvas" "id IN ($unlocked_canvas_ids)"
  append_copy_block "pixel" "canvas_id IN ($unlocked_canvas_ids)"
  append_copy_block "history" "canvas_id IN ($unlocked_canvas_ids)"
  append_copy_block "cooldown" "canvas_id IN ($unlocked_canvas_ids)"
  append_copy_block "frame" "canvas_id IN ($unlocked_canvas_ids)"

  gzip -f "$out"
  echo "$(date -Is) Backup created: $out.gz"

  find "$BACKUP_DIR" -type f -name "db-*.sql.gz" -mtime +$RETENTION_DAYS -delete || true
}

echo "Starting backup loop with UNLOCKED_INTERVAL_MINUTES=$UNLOCKED_INTERVAL_MINUTES, FULL_INTERVAL_MINUTES=$FULL_INTERVAL_MINUTES, RUN_SCHEMA_WITH_FULL=$RUN_SCHEMA_WITH_FULL, TZ=$TZ"

if [ "$RUN_UNLOCKED_ON_START" = "true" ]; then
  run_unlocked_backup
  date +%s > "$STATE_DIR/last_unlocked_epoch"
fi

if [ "$RUN_FULL_ON_START" = "true" ]; then
  if [ "$RUN_SCHEMA_WITH_FULL" = "true" ]; then
    run_full_backup &
    full_pid=$!
    run_schema_backup &
    schema_pid=$!
    wait "$full_pid"
    wait "$schema_pid"
  else
    run_full_backup
  fi
  date +%s > "$STATE_DIR/last_full_epoch"
  date +%s > "$STATE_DIR/last_unlocked_epoch"
fi

while true; do
  now_epoch=$(date +%s)

  last_full_epoch=$(cat "$STATE_DIR/last_full_epoch" 2>/dev/null || echo 0)
  full_interval_seconds=$((FULL_INTERVAL_MINUTES * 60))
  if [ $((now_epoch - last_full_epoch)) -ge "$full_interval_seconds" ]; then
    if [ "$RUN_SCHEMA_WITH_FULL" = "true" ]; then
      run_full_backup &
      full_pid=$!
      run_schema_backup &
      schema_pid=$!
      wait "$full_pid"
      wait "$schema_pid"
    else
      run_full_backup
    fi
    printf '%s\n' "$now_epoch" > "$STATE_DIR/last_full_epoch"
    printf '%s\n' "$now_epoch" > "$STATE_DIR/last_unlocked_epoch"
  fi

  last_unlocked_epoch=$(cat "$STATE_DIR/last_unlocked_epoch" 2>/dev/null || echo 0)
  unlocked_interval_seconds=$((UNLOCKED_INTERVAL_MINUTES * 60))
  if [ $((now_epoch - last_unlocked_epoch)) -ge "$unlocked_interval_seconds" ]; then
    run_unlocked_backup
    printf '%s\n' "$now_epoch" > "$STATE_DIR/last_unlocked_epoch"
  fi

  sleep "$LOOP_SLEEP_SECONDS"
done

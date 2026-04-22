#!/usr/bin/env bash
# Creates a data-only snapshot limited to currently unlocked canvases.
set -euo pipefail

: "${PGHOST:?PGHOST is required}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${PGDATABASE:?PGDATABASE is required}"

BACKUP_DIR=${BACKUP_DIR:-/backups}
RETENTION_DAYS=${RETENTION_DAYS:-14}

mkdir -p "$BACKUP_DIR"

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
  exit 0
fi

if ! [[ "$unlocked_canvas_ids" =~ ^[0-9]+(,[0-9]+)*$ ]]; then
  echo "Unlocked canvas ID list has unexpected format: $unlocked_canvas_ids" >&2
  exit 1
fi

append_copy_block() {
  local table="$1"
  local where_clause="$2"
  local cols

  cols="$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -At -v ON_ERROR_STOP=1 -c "SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table'")"
  if [ -z "$cols" ]; then
    echo "Could not resolve columns for table $table" >&2
    exit 1
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

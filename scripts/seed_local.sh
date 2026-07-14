#!/usr/bin/env bash
set -euo pipefail

LOCAL_USER="${LOCAL_USER:-dev-user}"
LOCAL_PASS="${LOCAL_PASS:-password}"
LOCAL_HOST="${LOCAL_HOST:-localhost}"
LOCAL_PORT="${LOCAL_PORT:-5433}"
LOCAL_DB="${LOCAL_DB:-dev_db}"
DUMP_FILE="${1:-/home/laureano-arcanio/ARC-AGI/dumps/arc_agi_db_20260704_175800.sql}"
export PGPASSWORD="$LOCAL_PASS"

CONN_STR="postgresql://${LOCAL_USER}@${LOCAL_HOST}:${LOCAL_PORT}"

echo "Dropping database '$LOCAL_DB'..."
psql "$CONN_STR/postgres" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$LOCAL_DB' AND pid <> pg_backend_pid();" 2>/dev/null || true
psql "$CONN_STR/postgres" -c "DROP DATABASE IF EXISTS \"$LOCAL_DB\";"

echo "Creating database '$LOCAL_DB'..."
psql "$CONN_STR/postgres" -c "CREATE DATABASE \"$LOCAL_DB\";"

echo "Restoring from $DUMP_FILE ..."
psql "$CONN_STR/$LOCAL_DB" < "$DUMP_FILE"

echo "Done."

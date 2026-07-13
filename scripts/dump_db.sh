#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_DIR="${DUMP_DIR:-./dumps}"
mkdir -p "$DUMP_DIR"
OUTPUT="${DUMP_DIR}/arc_agi_db_${TIMESTAMP}.sql"

CONNECTION_URL="${CONNECTION_URL:-postgresql://arc_agi_db_user:701zz7yhdqO46jYS1kIs2V5lDsPfTPYr@dpg-d8sqr0jtqb8s73epq260-a.ohio-postgres.render.com/arc_agi_db}"

echo "Dumping database to $OUTPUT ..."
pg_dump --no-owner --no-acl --clean --if-exists "$CONNECTION_URL" > "$OUTPUT"

echo "Done. Size: $(du -h "$OUTPUT" | cut -f1)"

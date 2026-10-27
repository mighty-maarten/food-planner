#!/bin/sh
# Nightly logical backup of the Food Planner database, next to the vzdump of the whole LXC: a
# dump restores into any PostgreSQL 18, also when only the database has to go back in time.
# Runs on the LXC from cron, before the vzdump at 02:00 (see DEPLOYMENT.md, "Backups").
set -eu

cd "$(dirname "$0")/.."
KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p backups
FILE="backups/food-planner-$(date +%Y-%m-%d).dump"

# -T: no TTY under cron. Custom format: compressed, restorable with pg_restore.
docker compose exec -T postgres sh -c 'pg_dump -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" -Fc' > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
find backups -name 'food-planner-*.dump' -mtime +"$KEEP_DAYS" -delete
echo "$(date -Iseconds) wrote $FILE ($(du -h "$FILE" | cut -f1))"

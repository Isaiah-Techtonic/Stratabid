#!/usr/bin/env bash
# StrataBid deploy script — run from /home/isaiah/stratabid
# Usage:
#   ./deploy.sh            # rebuild api + web + worker, restart nginx
#   ./deploy.sh --migrate  # also run any pending SQL migrations + re-introspect Prisma
#   ./deploy.sh --api      # rebuild only the api
#   ./deploy.sh --web      # rebuild only the web frontend
#   ./deploy.sh --worker   # rebuild only the worker
#
# Safe to run repeatedly. Uses --no-cache on rebuilds so code changes always land.

set -euo pipefail
cd "$(dirname "$0")"

# ---- Load DB creds from .env (for migrations / introspection) ----
if [ -f .env ]; then
  set -a; source .env; set +a
fi

NETWORK="$(docker network ls --format '{{.Name}}' | grep stratabid | head -n1)"

run_migrations() {
  echo "──► Running any pending SQL migrations…"
  # Track which migrations have run in a simple table; apply any *.sql not yet applied.
  docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c \
    "CREATE TABLE IF NOT EXISTS _migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now());" >/dev/null

  for f in $(ls api/prisma/0*.sql 2>/dev/null | sort); do
    base="$(basename "$f")"
    already="$(docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA -c \
      "SELECT 1 FROM _migrations WHERE filename='$base';" || true)"
    if [ "$already" = "1" ]; then
      echo "    • $base (already applied, skipping)"
    else
      echo "    • $base → applying"
      docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 < "$f"
      docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
        "INSERT INTO _migrations(filename) VALUES('$base');" >/dev/null
    fi
  done

  echo "──► Re-introspecting Prisma schema…"
  docker run --rm -v "$PWD/api:/app" -w /app --network "$NETWORK" \
    -e DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}" \
    node:20-alpine sh -c "apk add --no-cache openssl >/dev/null && npm install --no-audit --no-fund >/dev/null 2>&1 && npx prisma db pull && npx prisma generate" >/dev/null
  echo "    Prisma client regenerated."
}

REBUILD_API=false
REBUILD_WEB=false
REBUILD_WORKER=false
DO_MIGRATE=false
EXPLICIT_TARGET=false

for arg in "$@"; do
  case "$arg" in
    --migrate) DO_MIGRATE=true ;;
    --api) REBUILD_API=true; EXPLICIT_TARGET=true ;;
    --web) REBUILD_WEB=true; EXPLICIT_TARGET=true ;;
    --worker) REBUILD_WORKER=true; EXPLICIT_TARGET=true ;;
  esac
done

# With no explicit target flag (e.g. bare ./deploy.sh or just --migrate),
# rebuild all the code services.
if [ "$EXPLICIT_TARGET" = false ]; then
  REBUILD_API=true; REBUILD_WEB=true; REBUILD_WORKER=true
fi

echo "════════ StrataBid deploy ════════"

if [ "$DO_MIGRATE" = true ]; then
  run_migrations
fi

TARGETS=""
[ "$REBUILD_API" = true ] && TARGETS="$TARGETS api"
[ "$REBUILD_WEB" = true ] && TARGETS="$TARGETS web"
[ "$REBUILD_WORKER" = true ] && TARGETS="$TARGETS worker"

if [ -n "$TARGETS" ]; then
  echo "──► Rebuilding:$TARGETS (no-cache)…"
  docker compose build --no-cache $TARGETS
  docker compose up -d $TARGETS
fi

echo "──► Restarting nginx…"
docker compose restart nginx

echo "──► Status:"
docker compose ps

echo "════════ Deploy complete ════════"

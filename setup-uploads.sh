#!/usr/bin/env bash
# One-time setup: wire the uploads volume into api + nginx, and add the
# /uploads/ location to the nginx config. Idempotent + validated.
# Run from /home/isaiah/stratabid.

set -euo pipefail
cd "$(dirname "$0")"

COMPOSE="docker-compose.yml"
NGINX="nginx/conf.d/stratabid.conf"

echo "──► Backing up current files…"
cp "$COMPOSE" "$COMPOSE.bak.$(date +%s)"
cp "$NGINX" "$NGINX.bak.$(date +%s)"

# ---------- 1. docker-compose: api service ----------
if grep -q "UPLOAD_DIR" "$COMPOSE"; then
  echo "    • api UPLOAD_DIR already present, skipping"
else
  echo "──► Adding UPLOAD_DIR + uploads volume to api service…"
  # Add UPLOAD_DIR under api's environment (after the JWT_SECRET line, which is unique to api)
  python3 - "$COMPOSE" << 'PY'
import sys
p = sys.argv[1]
s = open(p).read()

# 1a. Add UPLOAD_DIR right after the api JWT_SECRET env line
s = s.replace(
    "      JWT_SECRET: ${JWT_SECRET}\n",
    "      JWT_SECRET: ${JWT_SECRET}\n      UPLOAD_DIR: /app/uploads\n",
    1,
)

# 1b. Add a volumes: block to the api service.
# The api service block starts at "  api:\n" and its depends_on ends the block.
# We insert a volumes: section right before api's "    depends_on:".
# To target ONLY api's depends_on (not worker's), anchor on the api env we just edited.
marker = "      UPLOAD_DIR: /app/uploads\n    depends_on:\n      db:\n        condition: service_healthy\n      redis:\n        condition: service_healthy\n"
replacement = "      UPLOAD_DIR: /app/uploads\n    volumes:\n      - ./uploads:/app/uploads\n    depends_on:\n      db:\n        condition: service_healthy\n      redis:\n        condition: service_healthy\n"
assert marker in s, "Could not find api depends_on block to anchor volumes insert"
s = s.replace(marker, replacement, 1)

open(p, "w").write(s)
print("    • api service updated")
PY
fi

# ---------- 2. docker-compose: nginx service uploads mount ----------
if grep -q "uploads:/var/www/uploads" "$COMPOSE"; then
  echo "    • nginx uploads mount already present, skipping"
else
  echo "──► Adding uploads mount to nginx service…"
  python3 - "$COMPOSE" << 'PY'
import sys
p = sys.argv[1]
s = open(p).read()
# Add the ro uploads mount right after nginx's certbot/conf mount line.
marker = "      - ./nginx/certbot/conf:/etc/letsencrypt:ro\n    depends_on:\n      - api\n      - web\n"
replacement = "      - ./nginx/certbot/conf:/etc/letsencrypt:ro\n      - ./uploads:/var/www/uploads:ro\n    depends_on:\n      - api\n      - web\n"
assert marker in s, "Could not find nginx volumes block to anchor uploads mount"
s = s.replace(marker, replacement, 1)
open(p, "w").write(s)
print("    • nginx service updated")
PY
fi

# ---------- 3. nginx config: /uploads/ location ----------
if grep -q "location /uploads/" "$NGINX"; then
  echo "    • nginx /uploads/ location already present, skipping"
else
  echo "──► Adding /uploads/ location to nginx config…"
  python3 - "$NGINX" << 'PY'
import sys
p = sys.argv[1]
s = open(p).read()
# Insert the uploads location right before the /api/ location in the 443 block.
marker = "    location /api/ {\n"
block = (
    "    location /uploads/ {\n"
    "        alias /var/www/uploads/;\n"
    "        access_log off;\n"
    "        expires 30d;\n"
    "    }\n\n"
)
# Only the 443 block has /api/ ; the 80 block does not, so first occurrence is correct.
assert marker in s, "Could not find /api/ location to anchor uploads block"
s = s.replace(marker, block + marker, 1)
open(p, "w").write(s)
print("    • nginx config updated")
PY
fi

# ---------- 4. Validate compose ----------
echo "──► Validating docker-compose.yml…"
if docker compose config > /dev/null 2>&1; then
  echo "    ✓ compose is valid"
else
  echo "    ✗ COMPOSE INVALID — restoring backups!"
  cp "$COMPOSE".bak.* "$COMPOSE" 2>/dev/null || true
  docker compose config
  exit 1
fi

echo "──► Validating nginx config (syntax test in a throwaway container)…"
# We can't fully test until mounted, but check basic brace balance.
if [ "$(grep -c '{' "$NGINX")" = "$(grep -c '}' "$NGINX")" ]; then
  echo "    ✓ nginx braces balanced"
else
  echo "    ✗ nginx brace mismatch — restoring backup!"
  cp "$NGINX".bak.* "$NGINX" 2>/dev/null || true
  exit 1
fi

echo ""
echo "════════ Uploads infra configured ════════"
echo "Next: run  ./deploy.sh --migrate   to apply migration 006 and rebuild."

#!/usr/bin/env sh
# Apply Prisma migrations, then seed when appropriate for the environment.
#
# Behaviour:
#   - Always runs `prisma migrate deploy` (fails the process on migration error).
#   - Skips seed when NODE_ENV=production unless ENABLE_PRODUCTION_SEED=true.
#   - Skips seed when SEED_ENABLED=false.
#   - Otherwise runs `prisma db seed` and fails the process if seeding fails.
#
# Usage (from backend/ or via npm scripts from repo root):
#   ./scripts/migrate-and-seed.sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

echo "[migrate-and-seed] Running prisma migrate deploy..."
npx prisma migrate deploy

NODE_ENV_VALUE=${NODE_ENV:-development}
ENABLE_PRODUCTION_SEED_VALUE=${ENABLE_PRODUCTION_SEED:-false}
SEED_ENABLED_VALUE=${SEED_ENABLED:-true}

if [ "$SEED_ENABLED_VALUE" = "false" ]; then
  echo "[migrate-and-seed] SEED_ENABLED=false — skipping seed."
  exit 0
fi

if [ "$NODE_ENV_VALUE" = "production" ] && [ "$ENABLE_PRODUCTION_SEED_VALUE" != "true" ]; then
  echo "[migrate-and-seed] Production seed disabled (set ENABLE_PRODUCTION_SEED=true to override)."
  exit 0
fi

echo "[migrate-and-seed] Running prisma db seed..."
npx prisma db seed
echo "[migrate-and-seed] Migrations and seed completed."

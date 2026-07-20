#!/usr/bin/env sh
# Apply Prisma migrations, then seed the same database unless explicitly disabled.
#
# Behaviour:
#   - Always runs `prisma migrate deploy` (fails the process on migration error).
#   - Skips seed when SEED_ENABLED=false.
#   - Skips seed when NODE_ENV=production AND ENABLE_PRODUCTION_SEED=false
#     (default ENABLE_PRODUCTION_SEED=true so demo deploys get data).
#   - Otherwise runs `prisma db seed` and fails the process if seeding fails.
#
# Usage (from backend/ or via npm scripts / Compose migrate service):
#   ./scripts/migrate-and-seed.sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

echo "[migrate-and-seed] Running prisma migrate deploy..."
npx prisma migrate deploy

NODE_ENV_VALUE=${NODE_ENV:-development}
# Opt-out in production: set ENABLE_PRODUCTION_SEED=false. Default is to seed.
ENABLE_PRODUCTION_SEED_VALUE=${ENABLE_PRODUCTION_SEED:-true}
SEED_ENABLED_VALUE=${SEED_ENABLED:-true}

if [ "$SEED_ENABLED_VALUE" = "false" ]; then
  echo "[migrate-and-seed] SEED_ENABLED=false — skipping seed (migrations applied)."
  exit 0
fi

if [ "$NODE_ENV_VALUE" = "production" ] && [ "$ENABLE_PRODUCTION_SEED_VALUE" = "false" ]; then
  echo "[migrate-and-seed] ENABLE_PRODUCTION_SEED=false — skipping seed (migrations applied)."
  exit 0
fi

echo "[migrate-and-seed] Running prisma db seed (NODE_ENV=${NODE_ENV_VALUE}, ENABLE_PRODUCTION_SEED=${ENABLE_PRODUCTION_SEED_VALUE})..."
npx prisma db seed
echo "[migrate-and-seed] Migrations and seed completed."

#!/usr/bin/env sh
# Run the Prisma seed entrypoint in a way that works both locally and inside
# the production backend image (Node 20 Alpine, NODE_ENV=production).
#
# Why not plain `ts-node prisma/seed.ts`?
# In the production container Node's ESM loader rejects `.ts` with
# ERR_UNKNOWN_FILE_EXTENSION. `tsx` executes TypeScript reliably there.
#
# Prefer tsx (dependency); fall back to ts-node transpile-only for odd envs.

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

if command -v tsx >/dev/null 2>&1; then
  exec tsx -r dotenv/config prisma/seed.ts
fi

if [ -x ./node_modules/.bin/tsx ]; then
  exec ./node_modules/.bin/tsx -r dotenv/config prisma/seed.ts
fi

if [ -x ../node_modules/.bin/tsx ]; then
  exec ../node_modules/.bin/tsx -r dotenv/config prisma/seed.ts
fi

# Last-resort fallback for local monorepo checkouts without tsx on PATH.
exec npx tsx -r dotenv/config prisma/seed.ts

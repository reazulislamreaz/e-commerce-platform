# Database Seed System

Production-ready, modular Prisma seed for Elevate Apparel. It populates every commerce domain needed for local development, CI integration tests, preview/staging demos, and optional production bootstraps.

## Quick start

```bash
# From repo root (Postgres must be up; see docker compose)
npm run prisma:migrate --workspace=backend   # or migrate deploy
npm run prisma:seed --workspace=backend

# Or migrate + seed in one step (used by CI and the production migrate job):
npm run prisma:migrate-and-seed --workspace=backend
```

Required env (also listed in `backend/.env.example`):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SEED_SUPER_ADMIN_EMAIL` | Super Admin login email |
| `SEED_SUPER_ADMIN_PASSWORD` | Min 12 chars |
| `SEED_SUPER_ADMIN_PHONE` | BD mobile (`01…` or `+8801…`) |

## Environment behaviour

| Condition | Result |
|-----------|--------|
| `SEED_ENABLED=false` | Skip all seeding |
| `NODE_ENV=production` and `ENABLE_PRODUCTION_SEED` ≠ `true` | Skip seeding (migrations still run) |
| `NODE_ENV=production` and `ENABLE_PRODUCTION_SEED=true` | Seed after migrate |
| development / test / preview | Seed after migrate (default) |

Optional knobs:

| Variable | Default | Purpose |
|----------|---------|---------|
| `SEED_PROFILE` | `full` | `full` = all modules; `core` = users + catalog + coupons + banners + stock alerts |
| `SEED_COMMERCE_DEMO` | `true` | When `full`, set `false` to skip carts/orders/CRM/etc. |
| `SEED_ADMIN_EMAIL` / `PASSWORD` / `PHONE` | demo admin | Staff `ADMIN` account |
| `SEED_DEMO_PASSWORD` | `CustomerDemoPass123` | Shared password for demo customers |

## What gets seeded

### Core (always when seed runs)

- **Users:** Super Admin (env), Admin (`admin@elevateapparel.demo`), 6 demo customers
- **Catalog:** 12 products from `frontend/features/products/data.ts` (variants, media, prices, fixture reviews)
- **Inventory:** `MAIN` location, opening balances/movements (`seed:opening:v1:{sku}`), stock alerts
- **Promotions:** `ELEVATE10`, `FREESHIP`, `MIDWEEK200`
- **Marketing:** HOME_HERO / HOME_PROMO / SHOP_BANNER / SALE_BANNER

### Commerce demo (`SEED_PROFILE=full` and `SEED_COMMERCE_DEMO=true`)

- Preferences + consent events
- Shipping addresses (Dhaka / Chattogram / Khulna)
- Carts + wishlists
- Orders `EASEED0001`–`EASEED0008` with payments, reservations, shipments, coupon redemptions, returns/exchanges
- User-linked published + pending reviews
- In-app notifications
- CRM metrics, segments, activity
- Contact messages + newsletter subscriptions
- Abandoned-cart recovery rows
- Sample report export job

## Architecture

```text
backend/prisma/
├── seed.ts                 # Entrypoint (`prisma db seed`)
└── seed/
    ├── config.ts           # Env parsing + production guard
    ├── client.ts           # Prisma client (pg adapter)
    ├── run.ts              # Ordered pipeline
    ├── types.ts            # Shared SeedContext
    ├── data/               # Deterministic fixtures
    ├── utils/              # ids, phone, money, logging
    └── seeders/            # One module per domain
```

Pipeline order (foreign keys / dependencies):

1. users → 2. catalog → 3. promotions → 4. marketing → 5. stock alerts  
→ (commerce) preferences → addresses → carts/wishlists → orders → reviews → notifications → CRM → contact/newsletter → abandoned carts → reports

## Idempotency rules

- Upsert by natural keys (`email`, `slug`, `sku`, `code`, deterministic UUIDs via `seedUuid(key)`)
- Orders skip when `number` (`EASEED####`) already exists — inventory is not double-applied
- Opening / sale / reserve movements use stable `idempotencyKey`s
- Inventory balances are never overwritten on catalog re-seed (`update: {}`)
- Super Admin: if any `SUPER_ADMIN` exists, it is reused (password not reset)

## Demo credentials (non-production)

| Role | Email | Password (default) |
|------|-------|--------------------|
| Super Admin | from `SEED_SUPER_ADMIN_*` | from env |
| Admin | `admin@elevateapparel.demo` | `AdminDemoPass123` |
| Customers | `rahim.khan@elevateapparel.demo`, … | `CustomerDemoPass123` |

Do not use these passwords in real production. When enabling production seed, set strong unique secrets via env.

## CI/CD

### GitHub Actions (`integration` job)

1. Start Postgres + Redis services  
2. `prisma generate`  
3. `npm run prisma:migrate-and-seed --workspace=backend` (fails the job if migrate **or** seed fails)  
4. Integration / COD smoke tests  

### Production Compose (`deploy/docker-compose.prod.yml`)

The `migrate` one-shot runs **only** `prisma migrate deploy` so a seed problem
never blocks rollouts.

To seed production once (after migrate has succeeded):

```bash
# On the VPS, with ENABLE_PRODUCTION_SEED=true and SEED_SUPER_ADMIN_* set:
docker compose --env-file .env -f docker-compose.prod.yml --profile seed run --rm seed
```

Then set `ENABLE_PRODUCTION_SEED=false` again.

## Extending for a new module

1. Add Prisma models/migrations as usual.
2. Create `backend/prisma/seed/seeders/<module>.seeder.ts` exporting `seedX(ctx: SeedContext)`.
3. Put fixed demo rows in `seed/data/` when useful; use `seedUuid('module:key')` for stable IDs.
4. Register the seeder in `seed/run.ts` **after** its FK dependencies.
5. Document new env vars in `.env.example` and this file.
6. Re-run seed twice locally and confirm counts do not grow (idempotency).

## Commands reference

```bash
npm run prisma:seed --workspace=backend
npm run prisma:migrate-and-seed --workspace=backend
SEED_PROFILE=core npm run prisma:seed --workspace=backend
SEED_COMMERCE_DEMO=false npm run prisma:seed --workspace=backend
ENABLE_PRODUCTION_SEED=true NODE_ENV=production npm run prisma:migrate-and-seed --workspace=backend
```

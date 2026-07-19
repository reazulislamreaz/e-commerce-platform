# E-commerce Platform: Project Overview

## Read this first

This document describes the repository as it exists today. Read [CLAUDE.md](./CLAUDE.md) first for mandatory engineering rules, then use this document to understand the current architecture, implementation status, and safe development workflow.

For Phase 1 frontend analysis (source of truth for APIs/entities), see [docs/FRONTEND_ANALYSIS.md](./docs/FRONTEND_ANALYSIS.md). For the unified NestJS + PostgreSQL implementation plan (domains, schema, APIs, security, and module order), see [docs/UNIFIED_BACKEND_IMPLEMENTATION_ROADMAP.md](./docs/UNIFIED_BACKEND_IMPLEMENTATION_ROADMAP.md). Do not implement commerce modules until that roadmap is accepted and blocking clarifications are answered.

## Purpose and current stage

This is an enterprise e-commerce platform foundation. It is a single npm workspace containing two independently deployable applications:

```text
ecommerce-platform/
├── frontend/                 Next.js storefront and dashboards
├── backend/                  NestJS versioned REST API
├── docker-compose.yml        Local PostgreSQL and Redis
├── CLAUDE.md                 Mandatory engineering guide
├── AGENTS.md                 Directs compatible agents to CLAUDE.md
└── PROJECT_OVERVIEW.md       This document
```

The MVP commerce platform is implemented end-to-end for Cash on Delivery: identity, public catalog, inventory (reservations, stock alerts, expiry cancellation), server cart/wishlist, addresses, coupons, orders (PENDING→CONFIRMED→PROCESSING→PACKED→SHIPPED→DELIVERED plus cancel/return/exchange), returns/exchanges (7-day window, condition attestation, sale exchange-only), notifications, preferences, contact/newsletter, moderated product reviews, CRM (metrics/segments/activity + 6h backfill), marketing banners CMS, abandoned-cart recovery, consent-gated Facebook Pixel, analytics dashboards with CSV/XLSX exports (recognized revenue = collected payments only), professional transactional email templates, and a role-gated `/admin` UI. Background work (outbox relay, retention, inventory expiry, CRM backfill, cart recovery, report generation) runs via replica-safe BullMQ jobs. Online payment gateways, invoice generation/download/print, and review media/object storage remain deferred; `Payment.providerRef` and order architecture stay extensible for later.

## Technology and runtime

| Area              | Technology                                                               |
| ----------------- | ------------------------------------------------------------------------ |
| Runtime           | Node.js 20.19.6 (defined in `.nvmrc`)                                    |
| Package manager   | npm workspaces; committed `package-lock.json`                            |
| Frontend          | Next.js 16, React 19, TypeScript, Tailwind CSS 4                         |
| Frontend state    | Redux Toolkit for client state; TanStack Query for API/server state      |
| Frontend requests | Axios with access-token attachment and refresh retry                     |
| Backend           | NestJS 11, TypeScript, class-validator/class-transformer                 |
| Database          | PostgreSQL 17 with Prisma 7                                              |
| Cache/jobs        | Redis 7 and BullMQ                                                       |
| Security          | JWT, refresh cookies, RBAC guards, Helmet, CORS, compression, throttling |
| Observability     | Pino via `nestjs-pino`, Swagger/OpenAPI                                  |

## Local service topology

```text
Browser
  └─ frontend (Next.js, http://localhost:3000)
       └─ REST requests with cookies + Bearer access token
            └─ backend (NestJS, http://localhost:4000/api/v1)
                 ├─ PostgreSQL (localhost:5432)
                 └─ Redis (localhost:6379)
```

Docker Compose runs only PostgreSQL and Redis. The frontend and backend normally run directly on the host during development.

## Startup procedure

Run these from the repository root in separate terminals:

```bash
nvm use
npm ci
docker compose up -d
npm run prisma:generate --workspace=backend
npm run prisma:migrate --workspace=backend
npm run prisma:seed --workspace=backend   # Super Admin + storefront catalog/opening inventory
```

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

Endpoints:

- Storefront: `http://localhost:3000`
- API health: `http://localhost:4000/api/v1/health`
- Swagger UI: `http://localhost:4000/docs`

Use `docker compose ps` to check infrastructure and `docker compose exec -T redis redis-cli ping` to check Redis.

## Environment configuration

Never commit real `.env` files. Templates are committed:

- `backend/.env.example`
- `frontend/.env.example`

Backend requires `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `FRONTEND_ORIGIN`. Local Docker defaults use PostgreSQL at `localhost:5432` and Redis at `localhost:6379`.

Frontend requires `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`.

## Backend architecture

### Core bootstrap

`backend/src/main.ts` configures:

- URI API versioning with global prefix `api` (`/api/v1/...`)
- global `ValidationPipe` with whitelist and forbidden unknown fields
- Helmet, compression, cookie parsing, and credentialed CORS
- Swagger UI at `/docs`
- Pino logging

`backend/src/app.module.ts` composes Config, Prisma, Redis/BullMQ, throttling, logging, authentication, and health modules. It globally registers JWT authentication, role authorization, the exception filter, and response transformation interceptor.

### Implemented API surface

| Route                        | State       | Notes                                                        |
| ---------------------------- | ----------- | ------------------------------------------------------------ |
| `GET /api/v1/health`         | Implemented | Public liveness endpoint                                     |
| `GET /api/v1/health/ready`   | Implemented | Readiness probe: checks PostgreSQL and Redis, 503 on failure |
| `POST /api/v1/auth/register` | Implemented | Creates a PENDING_VERIFICATION account and emails a verification link; duplicate email/phone → 409 |
| `GET /api/v1/auth/verify-email` | Implemented | Consumes the emailed token; sets `emailVerifiedAt` and activates the account |
| `POST /api/v1/auth/resend-verification` | Implemented | Re-sends the link; always 200 (no account enumeration) |
| `POST /api/v1/auth/login`    | Implemented | Verified accounts only; creates an auth session; sets HTTP-only refresh cookie. Optional `rememberMe` extends the refresh session to 30 days (default 7) |
| `POST /api/v1/auth/refresh`  | Implemented | Rotates refresh token; reuse revokes the whole token family; preserves the session's remember-me TTL |
| `POST /api/v1/auth/logout`   | Implemented | Revokes the current session and all of its refresh tokens    |
| `POST /api/v1/auth/forgot-password` | Implemented | Emails a single-use reset link (30 min expiry); always 200 (no account enumeration); ACTIVE accounts only |
| `POST /api/v1/auth/reset-password`  | Implemented | Consumes the reset token, sets the new password, revokes every session |
| `POST /api/v1/auth/change-password` | Implemented | Authenticated; requires current password; revokes all other sessions |
| `GET /api/v1/users/me`       | Implemented | Signed-in user profile (any role)                            |
| `PATCH /api/v1/users/me`     | Implemented | Self-service update of names and BD phone (E.164, unique → 409); email immutable |
| `POST /api/v1/users/admins`  | Implemented | Super Admin only: create an admin account                    |
| `GET /api/v1/users`          | Implemented | Cursor-paginated list; admins see customers only             |
| `GET /api/v1/users/:id`      | Implemented | Admins may read customer accounts only                       |
| `PATCH /api/v1/users/:id/status` | Implemented | Activate/suspend; suspension revokes all sessions        |
| `PATCH /api/v1/users/:id/role`   | Implemented | Super Admin only; SUPER_ADMIN never assignable            |
| `DELETE /api/v1/users/:id`   | Implemented | Soft delete + email anonymization + session revocation       |
| `GET /api/v1/products`       | Implemented | Public server-side filters, six sort modes, availability, offset pagination |
| `GET /api/v1/products/facets` | Implemented | Public category/subcategory/brand/size/color/price facets |
| `GET /api/v1/products/search` | Implemented | Public autocomplete search |
| `GET /api/v1/products/new-arrivals` | Implemented | Public new-arrival rail |
| `GET /api/v1/products/on-sale` | Implemented | Public sale rail |
| `GET /api/v1/products/by-ids` | Implemented | Batch resolver for Redux cart/wishlist/recently-viewed state |
| `GET /api/v1/products/id/:id` | Implemented | Public product detail by UUID |
| `GET /api/v1/products/:slug` | Implemented | Public product detail with variants, available stock, and published reviews |
| `GET /api/v1/products/:slug/related` | Implemented | Related by category or collection |
| `GET /api/v1/categories` / `GET /api/v1/brands` | Implemented | Public active taxonomy names |
| `POST/GET/PATCH/DELETE /api/v1/reviews` | Implemented | Owner-scoped reviews; create requires a delivered purchase; creates as `PENDING` |
| `GET/POST /api/v1/admin/reviews…` | Implemented | Admin list/detail/publish/reject with rating aggregate recompute |

The global response interceptor wraps successful results as `{ "success": true, "message", "data", "meta"? }` and the exception filter returns `{ "success": false, "message", "error", "statusCode", "path", "timestamp" }` (validation details under `details`). This is the contract mandated by `CLAUDE.md`; keep new endpoints on it.

### Auth and authorization

- Roles: `SUPER_ADMIN`, `ADMIN`, `CUSTOMER` (the `VENDOR` role was removed; the platform is single-merchant)
- Role hierarchy: `SUPER_ADMIN` has unrestricted access (the `RolesGuard` grants it every role-gated route) and is the only role that can manage admin accounts or change roles. `ADMIN` manages customers and business resources but can never create, modify, promote, suspend, or delete another admin or Super Admin. `CUSTOMER` has customer-scoped permissions only. Hierarchy rules live in `backend/src/modules/users/role-policy.ts`.
- Access JWTs expire in 15 minutes and carry `sub`, `email`, `role`, `sid` (session id), and `jti`. `JwtStrategy` re-validates the user's existence/status on every request, so suspension or deletion takes effect immediately.
- Refresh tokens are opaque random values in an HTTP-only cookie, stored server-side only as HMAC-SHA256 hashes in `refresh_token` rows that belong to an `auth_session` (one session per login/device). Tokens rotate on every refresh; replaying a consumed token revokes the entire token family and its session.
- Registration requires first name, last name, email, password, and a unique Bangladeshi mobile number (accepted as `01XXXXXXXXX` or `+8801XXXXXXXXX`, stored in E.164; see `common/utils/bd-phone.ts`). Accounts start as `PENDING_VERIFICATION` and can log in only after clicking the emailed verification link (24h expiry, single-use, SHA-256 hash stored in `verification_token`). There is no SMS/phone verification.
- Password recovery uses the same `verification_token` table with type `PASSWORD_RESET`: single-use emailed link, 30-minute expiry, newest link supersedes older ones, and a successful reset revokes every session. Password change (authenticated) requires the current password and revokes all other sessions. The password policy (12–128 chars, upper+lower+digit) is shared via `common/decorators/is-account-password.decorator.ts`.
- "Remember me" is a login flag persisted on `auth_session`; it extends the refresh cookie/session TTL to 30 days (7 days otherwise) and is preserved across refresh rotations. Access tokens stay at 15 minutes.
- Email delivery goes through `modules/mail/MailService`, which enqueues jobs on the BullMQ `email` queue (5 attempts, exponential backoff); `MailProcessor` sends via nodemailer SMTP (`SMTP_*` / `MAIL_FROM` env vars, Gmail app password locally). When `SMTP_USER` is unset in development the worker logs the verification link instead of sending.
- `@Public()` bypasses global JWT authentication.
- `@Roles(...)` works with the global `RolesGuard`.
- Auth routes have tighter throttling (register 5/min, login 10/min, refresh 30/min, resend-verification 3/min).

When adding authenticated endpoints, use DTOs and decorators/guards; never add authorization checks to a controller body.

### Persistence

Prisma schema: `backend/prisma/schema.prisma`.

Implemented identity models: `User`, `AuthSession`, `RefreshToken`, and `VerificationToken`.

Implemented catalog/inventory models: `Brand`, hierarchical `Category`, `CatalogCollection`, `Product`, product/category and product/collection joins, `ProductColor`, `ProductMedia`, `ProductVariant`, immutable-window `ProductPrice`, `InventoryLocation`, `InventoryBalance`, append-only `InventoryMovement`, and `ProductReview` (moderated writes with one active review per user/product). Money is `BIGINT` poisha. PostgreSQL raw migration constraints enforce nonnegative money/stock, `reserved <= on_hand`, rating ranges, one active price, and one primary category/collection/media. `pg_trgm` indexes public product search. All timestamps are `timestamptz`.

Use `PrismaService` through dependency injection. Always use `select`, cursor pagination, database indexes, and transactions where appropriate.

### Planned module boundaries

Implemented modules: auth, users, mail, health, catalog, inventory, platform (idempotency/outbox with SKIP LOCKED claims/audit/retention + BullMQ platform queue), addresses, promotions, cart, wishlist, orders, returns, reviews, notifications, preferences, contact, newsletter, admin-catalog, marketing (banners), cart-recovery, crm, and analytics/reports. Inventory availability is embedded in catalog responses; checkout reservations, stock alerts, PACKED fulfillment, reservation expiry (cancels stale pre-ship COD holds), exchange replacement reserves, and admin adjustments are live. Recognized revenue for analytics/CRM is payment `COLLECTED` only. Online payment gateway and invoice modules remain deferred.

When implementing one, create a focused NestJS module with controller, service, repository/data-access layer, DTOs, tests, Swagger annotations, and only the Prisma models/indexes necessary for that feature.

## Frontend architecture

### App structure

- `frontend/app/` — Next.js App Router pages and layouts
- `frontend/components/` — reusable UI, common, layout, and shared components
- `frontend/features/` — feature-owned API calls, hooks, schemas, and UI
- `frontend/providers/app-providers.tsx` — Redux and Query providers
- `frontend/services/api-client.ts` — shared Axios client
- `frontend/store/` — Redux store and client-only slices

The storefront now has a working Elevate Apparel shopping experience on top of the existing dark + gold brand UI. Auth, catalog, cart/wishlist (server-backed with Redux projection), checkout (COD), account commerce (addresses, orders, returns, coupons, notifications, preferences, moderated reviews), contact, and newsletter are API-backed. Homepage rails, shop/category/search server filtering, PDP variants/stock/reviews/related products, header autocomplete, cart product resolution, wishlist, recently viewed, sitemap, new arrivals, and sale read from the Nest catalog API. A role-gated `/admin` shell (ADMIN/SUPER_ADMIN) covers overview, analytics/exports, orders, returns, review moderation, inventory/stock alerts, coupons, banners, catalog/taxonomy, CRM customers, contact, newsletter, and users; storefront chrome is isolated from admin routes. `frontend/features/products/data.ts` remains only as the idempotent database seed fixture and local adapter for isolated tests. Online payment methods remain deferred.

### State rules

- Redux is only for client state: `auth`, `cart`, `wishlist`, and `recentlyViewed` slices (`frontend/store/`). Prefer shared selectors from `frontend/store/selectors.ts`.
- TanStack Query owns API/server state. Auth mutations and catalog queries live in their feature hooks.
- `features/products/api.ts` exports the active `httpProductCatalog`; the local adapter remains for tests/seed parity. `features/account/api.ts` exports the HTTP `accountRepository` (local storage remains for isolated tests only).
- Cart pricing helpers live in `features/cart/pricing.ts` (shared by bag + checkout). Server cart/wishlist hydrate and merge through feature APIs.
- Axios reads the Redux access token, attaches it as a Bearer token, and retries one failed request after calling `/auth/refresh`. A failed refresh signs the client out. With “Remember me”, auth persists in localStorage; without it, sessionStorage only.
- Forms must use React Hook Form and Zod; `features/auth/schemas.ts` is the pattern to follow.
- Do not pre-create empty Nest module folders. Add `controller` / `service` / `dto` when implementing a feature.

## Quality gates

Before handing off a change, run the relevant commands:

```bash
npm run build --workspace=backend
npm run build --workspace=frontend
npm run lint --workspace=frontend
npm run lint --workspace=backend
npm run test --workspace=backend
npm run test:integration --workspace=backend
npm run format
```

GitHub Actions CI (`.github/workflows/ci.yml`) runs a quality job (install, Prisma generate/validate, lint, unit tests, builds) plus an integration job with Postgres/Redis services (`prisma migrate deploy`, seed, `test:integration`). COD/review HTTP smoke lives under `*.smoke.integration.ts`; see [docs/COD_SMOKE_CHECKLIST.md](./docs/COD_SMOKE_CHECKLIST.md).

Backend unit tests use Jest (`*.spec.ts` next to the code under test); `auth.service.spec.ts` is the pattern to follow. Add targeted unit/integration tests with every business feature.

## Deployment notes

Both apps have multi-stage Dockerfiles pinned to Node 20 (matching `.nvmrc`) that build from the repository root (`docker build -f backend/Dockerfile .`) and run as the non-root `node` user. Before production use, provide production environment variables through the deployment platform, run Prisma migrations through a controlled deployment step (`prisma migrate deploy`), configure a real CORS origin, and use managed PostgreSQL/Redis/object storage.

## Working rules for future agents

1. Read `CLAUDE.md`, then this overview, before code changes.
2. Inspect existing files and avoid replacing foundations without a migration plan.
3. Implement vertically by feature, including schema, DTOs, service, API contract, frontend query hooks, and tests as applicable.
4. Keep security-sensitive values out of commits and logs.
5. Update this document whenever architecture, routes, infrastructure, or run commands materially change.

# E-commerce Platform: Project Overview

## Read this first

This document describes the repository as it exists today. Read [CLAUDE.md](./CLAUDE.md) first for mandatory engineering rules, then use this document to understand the current architecture, implementation status, and safe development workflow.

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

The platform foundation is implemented. Product, order, payment, vendor, and admin business features are intentionally not implemented yet. Do not claim that empty module directories are functioning features.

## Technology and runtime

| Area              | Technology                                                               |
| ----------------- | ------------------------------------------------------------------------ |
| Runtime           | Node.js 20.19.6 (defined in `.nvmrc`)                                    |
| Package manager   | npm workspaces; committed `package-lock.json`                            |
| Frontend          | Next.js 16, React 19, TypeScript, Tailwind CSS 4                         |
| Frontend state    | Redux Toolkit for client state; TanStack Query for API/server state      |
| Frontend requests | Axios with access-token attachment and refresh retry                     |
| Backend           | NestJS 11, TypeScript, class-validator/class-transformer                 |
| Database          | PostgreSQL 17 with Prisma 6                                              |
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

| Route                        | State       | Notes                                               |
| ---------------------------- | ----------- | --------------------------------------------------- |
| `GET /api/v1/health`         | Implemented | Public liveness endpoint                            |
| `POST /api/v1/auth/register` | Implemented | Validated customer account creation                 |
| `POST /api/v1/auth/login`    | Implemented | Access token response plus HTTP-only refresh cookie |
| `POST /api/v1/auth/refresh`  | Implemented | Rotates refresh token and returns an access token   |
| `POST /api/v1/auth/logout`   | Implemented | Requires access token; invalidates refresh token    |

The global response interceptor currently wraps successful results as `{ "data": ... }`. Preserve this contract unless deliberately migrating all clients and Swagger documentation to the response shape mandated by `CLAUDE.md`.

### Auth and authorization

- Roles: `SUPER_ADMIN`, `ADMIN`, `VENDOR`, `CUSTOMER`
- Access JWTs expire in 15 minutes.
- Refresh tokens expire in 7 days, are stored only as Argon2 hashes, rotate on use, and are sent in HTTP-only cookies.
- `@Public()` bypasses global JWT authentication.
- `@Roles(...)` works with the global `RolesGuard`.

When adding authenticated endpoints, use DTOs and decorators/guards; never add authorization checks to a controller body.

### Persistence

Prisma schema: `backend/prisma/schema.prisma`.

The only implemented domain model is `User`, with UUID primary keys, unique email, role/status fields, soft-delete timestamp, timestamps, and role/status plus created-at indexes. The initial migration is committed at `backend/prisma/migrations/20260715111344_init`.

Use `PrismaService` through dependency injection. Always use `select`, cursor pagination, database indexes, and transactions where appropriate.

### Planned module boundaries

The following module directories exist as intentional feature boundaries but have no business implementation yet: users, vendors, customers, products, categories, brands, inventory, cart, wishlist, orders, payments, coupons, reviews, upload, notifications, dashboard, analytics, and settings.

When implementing one, create a focused NestJS module with controller, service, repository/data-access layer, DTOs, tests, Swagger annotations, and only the Prisma models/indexes necessary for that feature.

## Frontend architecture

### App structure

- `frontend/app/` — Next.js App Router pages and layouts
- `frontend/components/` — reusable UI, common, layout, and shared components
- `frontend/features/` — feature-owned API calls, hooks, schemas, and UI
- `frontend/providers/app-providers.tsx` — Redux and Query providers
- `frontend/services/api-client.ts` — shared Axios client
- `frontend/store/` — Redux store and client-only slices

The storefront now has a working Elevate Apparel shopping experience on top of the existing dark + gold brand UI: shared header (search suggestions, wishlist, account menu, live cart badge), footer support links, merchandised homepage, shop/category/new/sale catalogs with sidebar + mobile filters/sort/pagination, product detail (variants, gallery zoom, reviews, related + recently viewed), cart and checkout (coupons, COD/bKash/card), wishlist, guest order confirmation, track order, and a full customer account area (profile, addresses, orders, notifications, coupons, returns/exchanges, support, settings). Auth login/register remain API-backed; session, cart, wishlist, and account commerce data persist in localStorage until products/orders APIs ship. Catalog data is still local placeholder content in `frontend/features/products/data.ts`. Affiliate marketing is intentionally not implemented. No vendor dashboard or admin UI is implemented yet.

### State rules

- Redux is only for client state: currently authentication and cart slices.
- TanStack Query owns all API/server state. Do not cache API entities in Redux.
- Axios reads the Redux access token, attaches it as a Bearer token, and retries one failed request after calling `/auth/refresh`. A failed refresh signs the client out.
- Forms must use React Hook Form and Zod; `features/auth/schemas.ts` is the pattern to follow.

## Quality gates

Before handing off a change, run the relevant commands:

```bash
npm run build --workspace=backend
npm run lint --workspace=frontend
npm run lint --workspace=backend
npm run format
```

Add targeted unit/integration tests with every business feature. Do not treat the current lack of automated tests as permission to skip new tests.

## Deployment notes

Both apps have multi-stage Dockerfiles. Before production use, revise them to run as non-root users, provide production environment variables through the deployment platform, run Prisma migrations through a controlled deployment step, configure a real CORS origin, and use managed PostgreSQL/Redis/object storage.

## Working rules for future agents

1. Read `CLAUDE.md`, then this overview, before code changes.
2. Inspect existing files and avoid replacing foundations without a migration plan.
3. Implement vertically by feature, including schema, DTOs, service, API contract, frontend query hooks, and tests as applicable.
4. Keep security-sensitive values out of commits and logs.
5. Update this document whenever architecture, routes, infrastructure, or run commands materially change.

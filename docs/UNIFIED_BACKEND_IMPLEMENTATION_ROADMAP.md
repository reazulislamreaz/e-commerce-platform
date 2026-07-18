# Elevate Apparel — Unified Backend & PostgreSQL Implementation Roadmap

> **Status:** Phase 1–2 planning refreshed from a full frontend audit (2026-07-18). **Do not implement commerce modules until this document is accepted and blocking clarifications (§0) are answered.**
>
> **Phase 1 companion:** [FRONTEND_ANALYSIS.md](./FRONTEND_ANALYSIS.md) — page inventory, entities, workflows, hardcoded rules.
>
> **Scope rule:** Every decision is grounded in the current monorepo (`frontend/`, `backend/`, `PROJECT_OVERVIEW.md`, `CLAUDE.md`). Features not present in frontend code (wallets, subscriptions, affiliate, admin/vendor UIs, Socket.IO dashboards) are **out of scope** for v1 unless listed as explicit future extensions.
>
> **Stack decision:** Continue **NestJS 11 + Prisma 7 + PostgreSQL 17 + Redis 7 + BullMQ**. Do not rewrite to Express.

---

## Document map (final deliverables)

Maps to the architect brief (Phases 1–2 / deliverables 1–18) plus engineering detail sections.

| # | Deliverable | Location |
|---|-------------|----------|
| 1 | Frontend Analysis | [FRONTEND_ANALYSIS.md](./FRONTEND_ANALYSIS.md) |
| 2 | Feature Inventory | §2 |
| 3 | Business Workflow Documentation | FRONTEND_ANALYSIS §5 + §16 / §15 |
| 4 | Module Breakdown | §3 + §9 + §23 |
| 5 | PostgreSQL Database Design | §4 + §6 + §13 |
| 6 | Prisma Schema Plan | §6 (models per domain); implement schema-first per module |
| 7 | ER Diagram | §5 |
| 8 | API Specification | §7 |
| 9 | NestJS Module Architecture | §8 + §9 + §10 |
| 10 | Authentication Design | §11 + §16 + current `modules/auth` |
| 11 | Authorization Design | §11 (RBAC) + `role-policy.ts` |
| 12 | BullMQ Usage Plan | §18 |
| 13 | Redis Usage Plan | §17 |
| 14 | Security Architecture | §11 |
| 15 | Performance Optimization Strategy | §12 + §13 |
| 16 | Testing Strategy | §21 |
| 17 | Deployment Strategy | §19 + §20 |
| 18 | Step-by-Step Implementation Roadmap | §22 + §23 |

**Mandatory build rule:** For every module: **Schema → Migration → Seed (if needed) → DTOs → Repository → Service → Controller → Swagger → Tests → Frontend repository swap**. Never ship an API without a finalized schema for that module.

---

## 0. Clarifications — DECIDED (2026-07-18)

Stakeholder decisions. These are binding for all Phase 3+ implementation.

| ID | Topic | Decision |
|----|-------|----------|
| C1 | Password reset | **Emailed reset link** with secure single-use token, **15–30 min expiry** (SHA-256 hash stored; align with verify-email pattern). Reset UI reads `?token=`. |
| C2 | Guest order tracking | Public track by **Order Number + Email** (phone optional secondary factor). |
| C3 | Cart / wishlist | **Server-side cart and wishlist**; guest cart identified by token, **merged into user cart on login**. |
| C4 | Payments | **COD only for v1 checkout.** Online methods (bKash/card) are deferred; UI notes they are coming soon. |
| C5 | Money unit | All monetary values stored as **`BIGINT` poisha** (taka × 100). API responses expose integer taka for storefront parity. |
| C6 | FREESHIP | Free-shipping coupons **only remove the shipping charge** — never produce an item discount and never stack with percent/fixed coupons. |
| C7 | Remember me | `rememberMe` flag on login **extends refresh token/session TTL**; access tokens stay short-lived (15 min). |
| C8 | Reviews | **Create review schema now**; review write APIs implemented when the review UI ships (delivered-purchase rule applies then). |
| C9 | Contact / newsletter | **Persist** contact messages and newsletter subscriptions in Postgres; emails via BullMQ; newsletter requires **explicit consent** (recorded at subscribe time) + unsubscribe token. |
| C10 | Return window | *Provisional (not explicitly confirmed):* enforce frontend policy — **7 days from delivery, unworn + tags, sale items exchange-only**. Flag before Milestone 7 if different. |

---

## 1. Project Analysis

### Purpose

Elevate Apparel is a Bangladesh-oriented premium apparel ecommerce storefront (BDT/৳, COD/bKash/card UI, Dhaka-centric addresses). The monorepo contains:

| App | Role | Maturity |
|-----|------|----------|
| `frontend/` | Next.js 16 storefront | Broad UI; commerce data mostly local — see [FRONTEND_ANALYSIS.md](./FRONTEND_ANALYSIS.md) |
| `backend/` | NestJS 11 API (`/api/v1`) | Identity + public catalog + inventory read model implemented |
| `docker-compose.yml` | Postgres 17 + Redis 7 | Local deps only |

### What is real today (backend)

| Area | State |
|------|--------|
| Health | `GET /health`, `GET /health/ready` (Postgres + Redis) |
| Auth | register, verify-email, resend-verification, login, refresh (rotate + reuse revoke), logout, forgot/reset/change password |
| Sessions | `AuthSession` + rotating `RefreshToken` (HMAC hash); JWT 15m with `sid`/`jti`; remember-me TTL |
| Users admin | create admin, list/get, status, role, soft-delete (Super Admin / Admin policies); `GET/PATCH /users/me` |
| Mail | BullMQ `email` queue + nodemailer; verification, password reset, order, contact, newsletter |
| Catalog | Public list/detail/facets/search/new/sale/related/batch endpoints; frontend HTTP-backed |
| Inventory | Location + constrained balances + append-only movements; checkout reserve/release/ship/return; admin adjust |
| Commerce | Server cart/wishlist (guest merge), addresses, coupons, COD orders/tracking/fulfillment, returns |
| Comms | Notifications, preferences/consent, contact, newsletter unsubscribe |
| Admin APIs | Catalog/inventory/coupons/orders/returns/reviews/contact/newsletter + role-gated `/admin` UI |
| Reviews | Delivered-purchase create → `PENDING`; admin publish/reject; product aggregate recompute |
| Platform | Idempotency, outbox, audit log, Redis throttling, retention purge |
| DB | Identity plus catalog, variant, BIGINT price, inventory, moderated reviews, and full COD commerce models |
| Envelope | `{ success, message, data, meta? }` |
| CI | `.github/workflows/ci.yml` — quality job + Postgres/Redis integration/smoke job |

### What is not implemented

Online payment gateways (bKash/card), review media/object-storage upload transport, affiliate, Google OAuth.

### User journeys (from frontend)

1. Browse → filter/sort/search → PDP → cart/wishlist
2. Guest or member checkout → coupon (members) → COD/bKash/card selector → confirmation / account order
3. Account: profile, password (simulated), addresses, orders, track, coupons, notifications, reviews list, returns/exchanges, settings
4. Auth: register → verify email → login → refresh interceptor → logout; forgot/reset password UI only
5. Contact / newsletter / WhatsApp widget (no persistence)

### Roles (typed, backend enum)

`SUPER_ADMIN` | `ADMIN` | `CUSTOMER` — storefront uses CUSTOMER only; no role-gated frontend routes yet. Single-merchant platform (no `VENDOR`). SUPER_ADMIN manages admins; ADMIN manages customers/business resources only.

### Evidence sources

- [FRONTEND_ANALYSIS.md](./FRONTEND_ANALYSIS.md), [PROJECT_OVERVIEW.md](../PROJECT_OVERVIEW.md), [CLAUDE.md](../CLAUDE.md)
- [backend/prisma/schema.prisma](../backend/prisma/schema.prisma)
- [frontend/features/products/types.ts](../frontend/features/products/types.ts), [data.ts](../frontend/features/products/data.ts)
- [frontend/features/account/storage.ts](../frontend/features/account/storage.ts)
- [frontend/app/checkout/checkout-client.tsx](../frontend/app/checkout/checkout-client.tsx)

---

## 2. Feature Inventory

### Implemented (API-backed)

| Feature | Notes |
|---------|--------|
| Register + email verification + resend | PENDING_VERIFICATION → ACTIVE; BD phone E.164 unique |
| Login / Refresh / Logout | Session + refresh rotation; reuse → revoke family |
| Users admin APIs | Super Admin / Admin role policy |
| Health liveness + readiness | DB + Redis |
| Email queue | Verification, password reset, order, contact, newsletter |
| Password reset / change + profile | Fully API-backed; reset email via BullMQ |
| Catalog + inventory reads | 12 products seeded; filters/sorts/facets/search/PDP/stock/reviews API-backed |
| Server cart / wishlist | Guest cookie cart + login merge; authenticated wishlist merge |
| Addresses / coupons | CRUD + validate/mine; ELEVATE10 + FREESHIP |
| COD orders + admin fulfillment | Atomic checkout, reservations, track-by-number+email, ship/deliver/cancel |
| Returns / notifications / preferences | 7-day window; sale exchange-only; in-app notifications from domain events |
| Contact / newsletter | Persisted + throttled; consent + hashed unsubscribe |
| Admin catalog / inventory / coupons | Swagger APIs with audit |
| Moderated reviews | Customer create/edit/delete + admin publish/reject; PDP shows published only |
| Admin UI (`/admin`) | Orders, returns, reviews, inventory, coupons, products, taxonomy, contact, newsletter, users |
| COD/review smoke | HTTP integration tests + [COD_SMOKE_CHECKLIST.md](./COD_SMOKE_CHECKLIST.md) |

### Implemented (UI + local/mock)

| Feature | Data source |
|---------|-------------|
| Recently viewed | Redux + localStorage |
| Static pages (about, FAQs, policies, store, size guide) | code |

### Placeholders / simulated

Google login, bKash/card gateways, review media uploads.

### Explicit non-goals (v1)

Affiliate marketing, vendor marketplace UI, wallets, subscriptions, Socket.IO live dashboards, Elasticsearch (until Postgres FTS proves insufficient).

---

## 3. Domain Breakdown

For each domain: purpose, business rules, tables, APIs, jobs, cache, permissions.

### 3.1 Platform (cross-cutting)

| Aspect | Design |
|--------|--------|
| Purpose | Config, logging, errors, response envelope, throttling, health, outbox, idempotency, audit |
| Tables | `idempotency_key`, `outbox_event`, `audit_log` |
| Jobs | Outbox relay → BullMQ |
| Cache | None for authority |

### 3.2 Identity & Access

| Aspect | Design |
|--------|--------|
| Purpose | Users, credentials, sessions, RBAC, OAuth-ready links, verification, login/security history |
| Rules | Email unique canonical lowercase; Argon2id passwords; refresh rotate + reuse detection; suspended/deleted cannot auth; PENDING policy: **cannot login until ACTIVE** (align registration to ACTIVE or verify-email first) |
| Tables | `user`, `user_profile`, `user_password`, `role`, `permission`, `user_role`, `role_permission`, `auth_session`, `refresh_token`, `device`, `oauth_account`, `verification_token`, `login_event`, `security_event`, `user_preference`, `consent_event` |
| APIs | Auth + `/users/me` + password change/reset |
| Permissions | `customer.self`, admin later |
| Jobs | Expire tokens, purge login events |
| Cache | Permission map short TTL optional |

### 3.3 Addresses

| Aspect | Design |
|--------|--------|
| Purpose | Saved shipping/billing; checkout snapshots separate |
| Rules | One default per `(user, type)`; Bangladesh-first; checkout does not auto-save address book |
| Tables | `address` |
| APIs | CRUD `/addresses` |
| Permissions | Own resources only |

### 3.4 Merchant ownership (single-merchant)

| Aspect | Design |
|--------|--------|
| Purpose | The platform sells only Elevate Apparel products — no marketplace |
| Rules | No vendor tables or `VENDOR` role; products are platform-owned |
| Tables | None (removed `vendor`, `vendor_member`) |
| APIs | None |

### 3.5 Catalog

| Aspect | Design |
|--------|--------|
| Purpose | Brands, hierarchical categories, collections, products, size/color variants, media, immutable price history |
| Rules | UUID primary keys; unique slug/SKU; one active price/primary taxonomy/media; BIGINT poisha; indexed current-price/discount projections updated with price windows |
| Tables | `brand`, `category`, `catalog_collection`, `product`, `product_category`, `product_collection`, `product_color`, `product_variant`, `product_media`, `product_price`, `product_review` (writes deferred per C8) |
| APIs | Public list/detail/batch/related/new/sale/search/facets/categories/brands |
| Jobs/cache | Deferred until write/admin APIs and measured cache benefit |
| Search | `pg_trgm` GIN over active product name/description/color plus relational search |

### 3.6 Inventory

| Aspect | Design |
|--------|--------|
| Purpose | On-hand/reserved stock and immutable movements; reservations added with checkout |
| Rules | SQL CHECKs enforce nonnegative values and `reserved <= on_hand`; storefront reads `on_hand - reserved`; opening movement is idempotent |
| Tables | **Now:** `inventory_location`, `inventory_balance`, `inventory_movement`. **Milestone 5:** reservation tables |
| APIs | Internal service; availability embedded in catalog. Admin adjustment API waits for admin workflow |
| Jobs | Reservation expiry begins in Milestone 5 |

### 3.7 Cart & Wishlist

| Aspect | Design |
|--------|--------|
| Purpose | Server cart (user/guest), wishlist, optional recently viewed |
| Rules | Unique line per variant; prices not trusted from cart; merge guest→user on login |
| Tables | `cart`, `cart_item`, `wishlist`, `wishlist_item`, `recently_viewed_product` |
| APIs | `/cart`, `/wishlist` |
| Cache | Short-lived cart optional; invalidate on mutate |

### 3.8 Promotions

| Aspect | Design |
|--------|--------|
| Purpose | Coupons; fix FREESHIP double-benefit bug (shipping OR discount, not both) |
| Rules | Case-insensitive unique code; auth required for account coupons; server recalculates |
| Tables | `promotion`, `coupon`, `promotion_product`, `promotion_category`, `coupon_redemption` |
| APIs | `POST /coupons/validate`, `GET /coupons/mine` |

### 3.9 Orders & Fulfillment

| Aspect | Design |
|--------|--------|
| Purpose | Guest/member orders, snapshots, timeline, tracking, shipments |
| Rules | Client totals ignored; immutable line/address snapshots; statuses: pending→confirmed→processing→shipped→delivered / cancelled / returned |
| Tables | `customer_order`, `order_address`, `order_item`, `order_status_history`, `shipment`, `shipment_item` |
| APIs | Create, list, detail, public track |
| Jobs | Status emails via outbox |

### 3.10 Payments

| Aspect | Design |
|--------|--------|
| Purpose | COD first; bKash/card later with webhooks |
| Rules | Idempotent attempts; never store PAN/CVV; double-entry ledger for reconciliation |
| Tables | `payment`, `payment_attempt`, `webhook_event`, `refund`, `refund_item`, `ledger_account`, `ledger_transaction`, `ledger_entry` |
| APIs | Init (later), webhooks, admin capture COD |

### 3.11 Reviews

| Aspect | Design |
|--------|--------|
| Purpose | Moderated reviews; verified purchase |
| Rules | One active review per user/product; update product rating aggregates in same txn |
| Tables | `review`, `review_media` |
| APIs | List public; create/own list authenticated |

### 3.12 Returns & Exchanges

| Aspect | Design |
|--------|--------|
| Purpose | Return/exchange requests with line items |
| Rules | Enforce 7-day / sale-exchange-only in service (versioned policy); quantities ≤ delivered |
| Tables | `return_request`, `return_item`, `return_status_history` |
| APIs | Create/list |

### 3.13 Notifications & Comms

| Aspect | Design |
|--------|--------|
| Purpose | In-app inbox, email delivery, contact, newsletter |
| Tables | `notification`, `notification_delivery`, `newsletter_subscription`, `contact_message` |
| APIs | Notifications CRUD-ish; contact/newsletter POST |
| Jobs | Email send workers |

### 3.14 Uploads

| Aspect | Design |
|--------|--------|
| Purpose | Product/review media metadata → object storage |
| Tables | `product_media` / `review_media` (storage keys) |
| APIs | Admin upload (v2 storefront-facing none) |

### Domains NOT in v1

Organizations (multi-tenant SaaS), Reports/Analytics OLTP dashboards (use warehouse later), Socket.IO realtime, CMS content tables (static pages stay in code until admin CMS is required).

---

## 4. Database Architecture

### Principles

- PostgreSQL 17 primary + optional read replicas
- Singular `snake_case` physical names via Prisma `@map` / `@@map`
- UUID public IDs (app UUIDv7 for new aggregates; keep existing user UUIDs)
- `bigint` identity for high-volume append-only logs
- Money: `bigint` minor units (BDT poisha: taka × 100) + `currency_code char(3)`
- Timestamps: `timestamptz(3)` UTC (migrate current `timestamp(3)`)
- Soft delete only master/customer-editable data; never soft-delete financial/order history
- Optimistic `version` on hot mutable rows (`inventory_balance`, `cart`, `payment`)
- Redis never authoritative for stock, coupons, payments, or tokens

### Topology

```text
NestJS API (stateless) ──ACID──► PostgreSQL primary
        │                              │
        ├── Redis (cache)              ├── read replicas (catalog/history)
        └── BullMQ workers ◄── outbox_event
```

### Migration philosophy

Expand → dual-write/backfill → switch read → contract. One commerce domain per migration batch. Named raw SQL for partial/exclusion/deferrable constraints Prisma cannot express.

---

## 5. ER Diagram

```mermaid
erDiagram
  user ||--|| user_profile : has
  user ||--|| user_password : has
  user ||--o{ user_role : assigned
  role ||--o{ role_permission : grants
  permission ||--o{ role_permission : maps
  user ||--o{ auth_session : opens
  auth_session ||--o{ refresh_token : rotates
  user ||--o{ address : owns
  brand ||--o{ product : labels
  product ||--o{ product_variant : has
  product_variant ||--o{ inventory_balance : stocked
  product_variant ||--o{ variant_price : priced
  cart ||--o{ cart_item : contains
  wishlist ||--o{ wishlist_item : contains
  coupon ||--o{ coupon_redemption : redeemed
  customer_order ||--o{ order_item : lines
  customer_order ||--o{ order_address : snapshots
  customer_order ||--o{ payment : paid_by
  payment ||--o{ refund : refunds
  customer_order ||--o{ return_request : may_have
  product ||--o{ review : receives
  user ||--o{ notification : receives
```

Full column-level design: see prior plan [`postgresql_database_architecture`](../.cursor/plans/postgresql_database_architecture_0b7e2780.plan.md) and §6 summary below.

---

## 6. Table Design (summary)

### Conventions per table

- Mutable: `created_at`, `updated_at`, `version` where contended
- Soft-delete: `deleted_at` on user, address, product, brand, category, collection, coupon, review, wishlist
- Immutable: `created_at` only — order_*, payment_attempt, ledger_*, inventory_movement, *_history, audit_log, login_event, security_event, outbox_event

### Core tables (grouped)

| Group | Tables | Key constraints / indexes |
|-------|--------|---------------------------|
| Identity | `user`, `user_profile`, `user_password`, `role`, `permission`, `user_role`, `role_permission` | Unique email; partial unique roles; RBAC FKs RESTRICT |
| Sessions | `auth_session`, `refresh_token`, `device`, `verification_token`, `oauth_account` | Unique `token_hash`; family reuse revoke; partial active indexes |
| Security | `login_event`, `security_event`, `audit_log` | BRIN/partition by time later |
| Profile | `address`, `user_preference`, `consent_event` | One default address per type |
| Catalog | brand/category/collection/product/options/variants/media/prices | Unique slug/SKU; GiST exclusion on price ranges; GIN search |
| Inventory | location/balance/reservation/items/movement | `reserved <= on_hand`; movement idempotency |
| Cart/Wish | cart/cart_item/wishlist/wishlist_item/recently_viewed | XOR user/guest; unique lines |
| Promo | promotion/coupon/eligibility/redemption | Unique uppercase code; redemption unique per order |
| Order | customer_order/address/item/status_history/shipment* | Unique order_number; total arithmetic CHECK |
| Pay | payment/attempt/webhook/refund*/ledger* | Unique provider event/txn; balanced ledger trigger |
| Social | review/review_media | Unique user+product active |
| Returns | return_request/item/status_history | Qty ≤ purchased |
| Comms | notification*/newsletter/contact | Partial unread index |
| Ops | idempotency_key, outbox_event | Unique scope+key; work queue index |

### Cascade policy (short)

- Disposable user state (sessions, carts, wishlist): CASCADE
- Commerce history (orders, payments, ledger): RESTRICT / SET NULL + snapshots
- Published catalog: soft-delete/archive; RESTRICT hard deletes with order refs

---

## 7. API Specification

Base: `https://api…/api/v1`  
Envelope (migrate to CLAUDE.md target):

```json
{ "success": true, "message": "…", "data": {}, "meta": {} }
```

Auth: Bearer access JWT unless `@Public()`. Refresh: HTTP-only cookie `refresh_token`.

### 7.1 Existing (keep; extend)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/health` | Public | Liveness |
| GET | `/health/ready` | Public | Postgres + Redis |
| POST | `/auth/register` | Public | PENDING_VERIFICATION + verification email; 409 on email/phone |
| GET | `/auth/verify-email` | Public | Activates account |
| POST | `/auth/resend-verification` | Public | Always 200 |
| POST | `/auth/login` | Public | ACTIVE only; session + refresh cookie |
| POST | `/auth/refresh` | Cookie | Rotate; reuse → revoke family |
| POST | `/auth/logout` | Bearer | Revoke session |
| POST | `/users/admins` | Super Admin | Create admin |
| GET | `/users` | Admin+ | Cursor page; admins see customers only |
| GET | `/users/:id` | Admin+ | |
| PATCH | `/users/:id/status` | Admin+ | Suspend revokes sessions |
| PATCH | `/users/:id/role` | Super Admin | SUPER_ADMIN never assignable |
| DELETE | `/users/:id` | Admin+ | Soft delete + anonymize |

### 7.2 Identity (next)

| Method | Path | Auth | Body / notes |
|--------|------|------|----------------|
| POST | `/auth/forgot-password` | Public | `{ email }` → always 202 |
| POST | `/auth/reset-password` | Public | `{ token, password }` |
| GET | `/users/me` | Bearer | Profile + prefs |
| PATCH | `/users/me` | Bearer | firstName, lastName, phone |
| POST | `/users/me/password` | Bearer | current + new; revoke other sessions |

### 7.3 Catalog (public)

| Method | Path | Query / notes |
|--------|------|----------------|
| GET | `/products` | filters*, sort, page/pageSize or cursor |
| GET | `/products/:slug` | detail + variants + media + rating |
| GET | `/products/:slug/related` | limit |
| GET | `/products/new-arrivals` | |
| GET | `/products/on-sale` | |
| GET | `/search` | `q`, limit |
| GET | `/categories` | tree |
| GET | `/brands` | list |

\*collections, categories, brands, sizes, colors, min/max price, availability, discount, minRating, query — mirrors frontend `ProductFilters`.

### 7.4 Cart / wishlist

| Method | Path | Auth |
|--------|------|------|
| GET/PUT | `/cart` | Bearer or guest token header |
| POST/PATCH/DELETE | `/cart/items` | same |
| POST | `/cart/merge` | Bearer (post-login) |
| GET | `/wishlist` | Bearer |
| PUT/DELETE | `/wishlist/:productId` | Bearer |

### 7.5 Coupons / orders

| Method | Path | Auth | Transaction |
|--------|------|------|-------------|
| POST | `/coupons/validate` | Optional/Bearer | Read + lock promo |
| GET | `/coupons/mine` | Bearer | |
| POST | `/orders` | Public+Bearer | Full checkout txn + Idempotency-Key |
| GET | `/orders` | Bearer | Cursor page |
| GET | `/orders/:id` | Bearer ownership | |
| GET | `/orders/track` | Public | number + email/phone |

### 7.6 Account

| Method | Path | Auth |
|--------|------|------|
| CRUD | `/addresses` | Bearer |
| GET/PATCH | `/notifications` | Bearer |
| POST | `/notifications/read-all` | Bearer |
| GET/POST | `/reviews` | Public list / Bearer create |
| GET/POST | `/returns` | Bearer |

### 7.7 Payments (phase after COD)

| Method | Path | Auth |
|--------|------|------|
| POST | `/payments/bkash/init` | Order owner |
| POST | `/payments/webhooks/bkash` | Signature |
| POST | `/payments/webhooks/card` | Signature |

### 7.8 Content ingest

| Method | Path | Auth |
|--------|------|------|
| POST | `/contact` | Public + strict throttle |
| POST | `/newsletter` | Public + strict throttle |

### Error contract

`400` validation · `401` auth · `403` RBAC · `404` · `409` conflict (email, stock, coupon, idempotency mismatch) · `429` · `500` unexpected (never leak stacks).

### Frontend integration

Swap exports only:

- `productCatalog` → `httpProductCatalog`
- `accountRepository` → `httpAccountRepository`

Keep pages/hooks; do not bypass repositories.

---

## 8. Backend Architecture

### Style

Clean layered NestJS feature modules:

```text
Controller (HTTP/DTO/Swagger)
  → Service (business rules, transactions, events)
    → Repository (Prisma selects, locks, pagination)
      → PostgreSQL
```

No business logic in controllers. No Prisma in controllers. Guards/filters/interceptors global.

### Keep / extend existing

- Global `ValidationPipe` (whitelist + forbidNonWhitelisted)
- `JwtAuthGuard` + `@Public()` + `RolesGuard` + `@Roles()`
- Helmet, compression, CORS credentials, cookie parser
- Throttler (tighten auth/contact)
- Pino redaction
- Swagger `/docs` (complete `@ApiProperty` / operations)

### Response interceptor

Migrate from `{ data }` to `{ success, message, data, meta }` with coordinated frontend `unwrapData` update in the same release.

---

## 9. Folder Structure

```text
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/                 # env validation, config modules
│   ├── prisma/                 # PrismaModule / PrismaService
│   ├── common/
│   │   ├── decorators/         # Public, Roles, CurrentUser, Idempotency
│   │   ├── guards/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   ├── dto/                # pagination meta
│   │   └── utils/              # money, cursor, hashing
│   ├── modules/
│   │   ├── health/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── addresses/
│   │   ├── catalog/            # products, categories, brands
│   │   ├── inventory/
│   │   ├── cart/
│   │   ├── wishlist/
│   │   ├── promotions/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── reviews/
│   │   ├── returns/
│   │   ├── notifications/
│   │   ├── contact/
│   │   └── uploads/
│   ├── jobs/                   # BullMQ processors
│   └── database/               # seed helpers
└── test/                       # e2e
```

Each feature module: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `dto/`, specs.

**Do not** create empty stub modules ahead of implementation.

---

## 10. Module Dependency Graph

```mermaid
flowchart TB
  Platform[Platform health config outbox]
  Auth[Auth Identity]
  Users[Users Profiles Prefs]
  Addr[Addresses]
  Catalog[Catalog]
  Inv[Inventory]
  Cart[Cart Wishlist]
  Promo[Promotions]
  Orders[Orders]
  Pay[Payments]
  Rev[Reviews]
  Ret[Returns]
  Notif[Notifications Comms]

  Platform --> Auth
  Auth --> Users
  Users --> Addr
  Users --> Catalog
  Catalog --> Inv
  Catalog --> Cart
  Catalog --> Promo
  Inv --> Orders
  Cart --> Orders
  Promo --> Orders
  Users --> Orders
  Addr --> Orders
  Orders --> Pay
  Orders --> Rev
  Orders --> Ret
  Orders --> Notif
  Auth --> Notif
```

**Build order follows edges left-to-right / top-to-bottom.** Orders require Catalog + Inventory + Promo (+ optional Cart). Payments require Orders. Reviews/Returns require delivered Orders.

---

## 11. Security Architecture

| Control | Implementation |
|---------|----------------|
| Passwords | Argon2id; isolated `user_password` table |
| Tokens | Access JWT 15m; refresh hashed, rotated, family reuse revoke |
| JWT validate | Load user status/deleted/role on each request (or short-lived version claim) |
| RBAC | `role`/`permission` tables + `@Roles` / permission decorator |
| Validation | DTO class-validator; never trust client money/stock |
| Injection | Prisma parameterized only; raw SQL bind params |
| Rate limit | Global + stricter auth/contact/newsletter; Redis store for multi-instance |
| Headers | Helmet |
| CORS | `FRONTEND_ORIGIN` allowlist + credentials |
| Cookies | HttpOnly; Secure in prod; SameSite=Lax (or None+Secure if cross-site) |
| CSRF | SameSite + CORS for cookie refresh; state-changing APIs use Bearer |
| PII | Soft-delete anonymization; redact logs (already Pino paths) |
| Payments | No PAN/CVV; encrypt provider blobs; webhook signatures |
| Soft-delete email | Partial unique on email WHERE deleted_at IS NULL **or** anonymize email on delete |
| Account routes | Add Next.js middleware for `/account/**` (today client-only) |

Security ships with each module — never deferred.

---

## 12. Performance Strategy

- Cursor pagination `(created_at, id)` for large lists; offset OK for small admin pages
- Prisma `select` / batch includes; ban N+1
- Partial indexes for active products, unread notifications, active carts
- Covering indexes only after `EXPLAIN` proof
- Server-side catalog filter/sort (stop shipping full catalog to browser)
- Cache product detail & category tree; never cache stock/payment
- Short transactions; no HTTP inside DB locks
- `pg_stat_statements` + p95 latency alerts

---

## 13. PostgreSQL Optimization Strategy

- Autovacuum more aggressive on `inventory_balance`, `cart_item`, `notification`, `idempotency_key`
- Partition monthly: `audit_log`, `login_event`, `outbox_event`, `inventory_movement`, `webhook_event` — **only after volume**
- GIN on product `search_vector`; GiST exclusion for price windows
- BRIN on append-only timestamps
- Avoid partitioning `customer_order` / `user` early
- Materialized views for admin analytics only (concurrent refresh)
- Connection pooling via PgBouncer; sized below `max_connections`

---

## 14. Transaction Strategy

| Workflow | Isolation / locking |
|----------|---------------------|
| Register | READ COMMITTED; unique email catch → 409 |
| Refresh rotate | `SELECT … FOR UPDATE` token/session; deterministic order |
| Checkout | Idempotency claim → lock inventory by variant ID order → lock coupon → insert order/payment/reservation/outbox |
| Webhook | Unique provider event → lock payment → append attempt/ledger → update status |
| Refund | Lock payment → sum refunds → append refund/ledger |
| Inventory adjust | Lock balance → movement + update |

Deadlock prevention: always lock resources in global ID order. Retry transient serialization/deadlock with jitter (bounded).

---

## 15. Payment Integrity Strategy

1. **COD (v1):** create `payment` pending/authorized-on-delivery; capture on delivery event; ledger receivable → cash/clearing.
2. **bKash/card (v2):** init attempt with Idempotency-Key; provider redirect/callback; webhook dedupe; capture only when amount/currency/order match.
3. Immutable `payment_attempt` + `webhook_event`; unique provider txn/event IDs.
4. Refunds cannot exceed captured; allocations sum to refund.
5. Double-entry `ledger_*` for reconciliation (not customer wallets).
6. UI: until providers live, either hide bKash/card or label “coming soon” — do not fake paid state.

---

## 16. Registration & Auth Flow Strategy

**Already implemented** (keep; extend for password reset / change):

```text
Client POST /auth/register
  → validate DTO (names, email, BD phone → E.164, password policy)
  → canonicalize email lowercase
  → BEGIN
       insert user (PENDING_VERIFICATION, role CUSTOMER)
       insert verification_token (EMAIL_VERIFICATION, SHA-256 hash, 24h)
       enqueue email job (verification link)
  → COMMIT
  → 201 user (no session)

Client GET /auth/verify-email?token=
  → hash lookup → set emailVerifiedAt + ACTIVE → consume token

Client POST /auth/login
  → only ACTIVE + verified; create AuthSession + RefreshToken; set HTTP-only cookie
  → return accessToken + user

Client POST /auth/refresh → rotate; reuse → revoke family + session
Client POST /auth/logout → revoke session + tokens
```

**Still to implement (after C1, C7):**

- `POST /auth/forgot-password` (always 200; enqueue reset email)
- `POST /auth/reset-password` (token + new password; revoke sessions)
- `POST /auth/change-password` (authenticated; current + new; revoke other sessions optional)
- Optional: `rememberMe` on login extends refresh `expiresAt`

OAuth (`oauth_account`) deferred — Google button disabled. Concurrent register: unique email/phone → 409.

---

## 17. Caching Strategy

| Data | Store | TTL / invalidate |
|------|-------|------------------|
| Product by slug | Redis | Version key / outbox invalidate |
| Category tree | Redis | On category write |
| Homepage merchandising | Redis | On publish |
| Permission set | Redis optional | On role change |
| Stock, coupons, carts, payments, tokens | **Never** | — |

CDN for media URLs only.

---

## 18. Queue Strategy

BullMQ is live for **email**. Use queues only where async adds value:

| Queue | Jobs | Status |
|-------|------|--------|
| `email` | Verification, welcome, reset password, order confirmation, shipping | Live (verification) |
| `notification` | Fan-out in-app after order/status events | Planned |
| `inventory` | Reservation expiry | Planned |
| `payments` | Webhook retry / reconcile | Planned (M8) |

Pattern: write outbox/domain row in same DB transaction → worker processes → retry with exponential backoff → DLQ/logging. Do **not** queue simple CRUD.

Workers are horizontally scalable. No Socket.IO in v1.

---

## 19. Deployment Strategy

- Apps: multi-stage Docker, **Node 20** (match `.nvmrc`), non-root user, healthchecks
- Compose: Postgres + Redis (+ optional API) with healthchecks, no public Redis without auth in non-local
- Migrations: `prisma migrate deploy` in release job **before** new pods
- Secrets: platform env / secret manager — never commit `.env`
- Managed Postgres (PITR, WAL archive) + managed Redis TLS
- Object storage (S3/R2) for media
- Stateless API replicas behind LB; sticky sessions not required

---

## 20. CI/CD Strategy

GitHub Actions **exists** (`.github/workflows/ci.yml`): install, Prisma generate/validate, lint, backend tests, both builds on push/PR to `main`.

Extend over milestones:

1. Keep current lint + Prisma validate + unit tests + builds  
2. Add ephemeral Postgres for integration tests  
3. Add e2e: auth + catalog read + COD place order + track  
4. OpenAPI / contract snapshot vs frontend types  

Deploy: build images → `prisma migrate deploy` → rolling update → smoke `/health/ready`.

---

## 21. Testing Strategy

| Layer | Coverage |
|-------|----------|
| Unit | Services: coupon math, order totals, status transitions, FREESHIP semantics |
| Integration | Repositories + Postgres: register race, refresh reuse, checkout stock race, webhook dedupe |
| E2E | Auth flow, catalog read, COD place order, track order |
| Contract | OpenAPI snapshot / frontend type alignment |

Every module checklist (§22) requires tests before “done.”

---

## 22. Step-by-Step Implementation Roadmap

### Milestone 0 — Foundation (mostly done — verify gaps only)

Already shipped: envelope, sessions + refresh rotation, JwtStrategy status checks, readiness health, register 409, email verification, CI, Node 20 Docker, auth Swagger, users admin.

Remaining M0 gaps (if any): soft-delete email anonymization audit, auth throttle coverage, exclude `/auth/login` from refresh-on-401 interceptor on frontend, Next middleware for `/account/**`.

**Exit:** No commerce tables yet; auth + CI green.

### Milestone 1 — Identity completion — **SHIPPED (2026-07-18)**

- `VerificationTokenType.PASSWORD_RESET` + `auth_session.remember_me` (migration `20260718082405`)
- APIs: `POST /auth/forgot-password` (30-min single-use link, enumeration-safe), `POST /auth/reset-password` (revokes all sessions), `POST /auth/change-password` (revokes other sessions), `GET/PATCH /users/me` (names + BD phone)
- `rememberMe` on login → 30-day refresh session (7-day default), preserved across rotations
- Password-reset email via BullMQ `email` queue (brand template)
- Frontend wired: forgot/reset (token from `?token=`), change password, profile (incl. phone), login sends `rememberMe`
- Deferred to Milestone 7: `user_preference` (settings toggles persist with notifications module, where they take effect)

### Milestone 2 — Catalog + inventory — **SHIPPED (2026-07-18)**

- PostgreSQL: brand, hierarchical category, collection, product joins, colors, media, UUID variants, immutable price windows, BIGINT poisha projections, location/balance/movement, review schema
- Raw constraints: one active price/primary taxonomy/media; money/rating/stock checks; `reserved <= on_hand`; movement idempotency; `pg_trgm` GIN search
- Idempotent seed imports all 12 frontend products, 102 variants, published fixture reviews, and opening inventory without overwriting live balances on rerun
- Public API: list (all frontend filters + six sorts + offset meta), facets, search, new, sale, detail by UUID/slug, related, batch IDs, categories, brands
- Inventory remains internal; catalog batches availability as `on_hand - reserved` without N+1. Reservations ship with checkout (M5)
- Frontend active `productCatalog` is HTTP-backed across homepage, shop/category/search, PDP, autocomplete, cart/wishlist/recent resolution, and sitemap; fixture remains seed/test-only
- Quality: 70 unit tests total + 3 PostgreSQL integration tests; backend/frontend lint and builds pass

### Milestone 3 — Addresses

Address CRUD; one default per `(user, type)` partial unique.

### Milestone 4 — Promotions (after C6)

Coupon tables; validate API; FREESHIP = free shipping only; `GET /coupons/mine`.

### Milestone 5 — COD checkout & orders (after C2, C4)

Idempotency + inventory reservation + order snapshots (incl. email/notes) + track API.  
Frontend: checkout → `POST /orders`; confirmation/track from API.

### Milestone 6 — Cart / wishlist sync (only if C3 chooses server)

Server cart/wishlist; merge on login.

### Milestone 7 — Reviews, returns, notifications, contact, newsletter (C8–C10) — shipped (review media deferred)

### Milestone 8 — Online payments (bKash/card) + refunds + ledger — deferred

### Milestone 9 — Cache warming, search tuning, email templates polish

### Milestone 10 — Admin commerce APIs + admin UI — shipped; ops, load test, prod cutover remain

---

## 23. Module-by-Module Development Order

| Order | Module | Schema first | Depends on |
|------:|--------|--------------|------------|
| 0 | Platform (envelope, health, outbox, idempotency) | ops tables | — |
| 1 | Auth / Identity | identity tables | 0 |
| 2 | Users / Prefs | profile, prefs | 1 |
| 3 | Catalog | catalog + media + price | 2 |
| 4 | Inventory | inventory* | 3 |
| 5 | Addresses | address | 2 |
| 6 | Promotions | promotion* | 3 |
| 7 | Cart / Wishlist | cart*, wishlist* | 3, 4 |
| 8 | Orders | order* | 4–7 |
| 9 | Payments (COD) | payment + ledger seed | 8 |
| 10 | Reviews | review* | 8 |
| 11 | Returns | return* | 8, 9 |
| 12 | Notifications / Contact / Newsletter | comms* | 1, 8 |
| 13 | Payments (bKash/card) | webhook/refund | 9 |
| 15 | Uploads (admin) | media keys | 4 |
| 16 | Admin catalog/order APIs | permissions | 4, 9 |

### Module completion checklist

A module is **done** only when:

- [ ] Schema + relationships + constraints + indexes  
- [ ] Migration (+ seed if required)  
- [ ] DTOs / validation  
- [ ] Repository + Service + Controller  
- [ ] AuthN / AuthZ  
- [ ] Swagger  
- [ ] Unit + integration tests  
- [ ] Logging / errors  
- [ ] Performance & security review  
- [ ] Frontend repository wired **or** explicitly deferred with ticket  

---

## 24. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Express rewrite temptation | Reject; NestJS already foundation |
| Envelope mismatch `{data}` vs CLAUDE | Single coordinated migration |
| Client-trusted prices/coupons | Server recalculation always |
| FREESHIP double discount | Explicit promotion reward types |
| Refresh race / single hash | Session table + FOR UPDATE |
| Soft-delete blocks email reuse | Partial unique or anonymize |
| PENDING login allowed | Policy: ACTIVE only |
| Guest track insecure | Require number + email/phone |
| Over-partitioning early | Defer until metrics |
| Empty stub modules | Create only when implementing |
| Docker/Node mismatch | Pin Node 20; fix workspace Docker context |
| No CI/tests | Milestone 0 |
| Payment UI without gateway | COD-only until M14 |
| Admin scope creep | Users module ships admin management APIs only; defer UIs |
| Prisma vs advanced PG constraints | Raw SQL migrations reviewed |

---

## 25. Future Scalability Plan

- Horizontal API + worker replicas; shared Redis; primary write / replica read  
- Outbox → event consumers for search index, warehouse, notifications  
- Extract payments/catalog to services only when team/ops demand — keep UUID boundaries ready  
- Meilisearch/OpenSearch if FTS insufficient  
- If a marketplace is ever introduced, add vendor domain + payouts/wallets as **new** aggregates (a new Role enum value and vendor tables), not overloaded ledger accounts  
- CDC to analytics warehouse; no heavy reporting on OLTP  

---

## Acceptance gate (before coding commerce)

1. Stakeholders accept this unified roadmap **and** [FRONTEND_ANALYSIS.md](./FRONTEND_ANALYSIS.md).  
2. All blocking clarifications **§0 (C1–C10)** answered in writing.  
3. Money unit (C5) and FREESHIP semantics (C6) accepted.  
4. Registration policy confirmed as-is: **PENDING_VERIFICATION until email verified** (already live).  
5. Milestone 0 gaps closed or explicitly deferred.

**After acceptance:** close M0 gaps → Milestone 1 (auth completion) → Milestone 2 (catalog) as the first customer-visible commerce delivery.

---

## Related documents

- [FRONTEND_ANALYSIS.md](./FRONTEND_ANALYSIS.md) — Phase 1 frontend source-of-truth audit  
- [PROJECT_OVERVIEW.md](../PROJECT_OVERVIEW.md) — current runtime reality  
- [CLAUDE.md](../CLAUDE.md) — engineering standards & brand theme  

---

*Last updated: 2026-07-18 (Phase 1–2 refresh from full frontend audit). Update whenever module order, schema boundaries, or API contracts change.*

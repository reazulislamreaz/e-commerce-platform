# Elevate Apparel — Frontend Analysis (Phase 1)

> **Status:** Complete. Frontend is the **single source of truth** for backend contracts.
> **Companion:** [UNIFIED_BACKEND_IMPLEMENTATION_ROADMAP.md](./UNIFIED_BACKEND_IMPLEMENTATION_ROADMAP.md) (Phase 2 planning).
> **Rule:** Never invent APIs or entities that the storefront does not require. Do not implement commerce modules until the roadmap is accepted and open clarifications are resolved.
>
> **Implementation update (2026-07-18):** Identity and Milestone 2 Catalog + Inventory are now API-backed. Sections describing bundled/local catalog behavior preserve the Phase 1 evidence baseline; current runtime state is documented in `PROJECT_OVERVIEW.md` and the roadmap Milestones 1–2.

---

## 1. Project structure

```text
frontend/
├── app/                    # Next.js App Router pages (40 routes)
├── components/
│   ├── account/            # Account shell, order request forms
│   ├── common/             # FormField, shared primitives
│   ├── layouts/            # Header, footer, mobile nav/drawer
│   ├── product/            # PDP clients, size guide, actions
│   ├── shared/             # Product card/grid, search, wishlist, newsletter
│   └── shop/               # Catalog + filter panel
├── features/
│   ├── auth/               # Live HTTP: login, register, verify, logout
│   ├── account/            # Swappable repository → localStorage today
│   ├── cart/               # Pricing helpers (shipping, lines)
│   └── products/           # Catalog types, static data, filter/sort, hooks
├── store/                  # Redux: auth, cart, wishlist, recentlyViewed
├── services/api-client.ts  # Axios + Bearer + refresh retry
├── providers/              # Redux + TanStack Query
├── types/                  # AuthUser, API envelope helpers
└── lib/                    # Currency (৳), fonts, storage, contact config
```

### Data-access boundaries (must preserve)

| Domain | Import from | Never bypass |
|--------|-------------|--------------|
| Products | `@/features/products` | `features/products/data` from pages |
| Account | `@/features/account` (`accountRepository`) | `storage.ts` from UI |
| Auth | `features/auth/api.ts` + hooks | ad-hoc fetch |
| HTTP | `services/api-client.ts` | raw axios elsewhere |

### State ownership

| State | Owner | Persistence |
|-------|--------|-------------|
| Auth session + access token | Redux | localStorage (remember me) or sessionStorage |
| Cart | Redux | `elevate:cart` |
| Wishlist | Redux | `elevate:wishlist` |
| Recently viewed | Redux | `elevate:recentlyViewed` (max 12) |
| Account commerce | TanStack Query → `accountRepository` | `elevate:account:{userId}:*` |
| Guest last order | — | `sessionStorage` `elevate:lastOrder` |
| Catalog | Server Components / Query hooks | Bundled `data.ts` (12 products) |

---

## 2. What is live vs local

### API-backed today

| Endpoint | Frontend usage |
|----------|----------------|
| `POST /auth/register` | Register form |
| `POST /auth/login` | Login form |
| `GET /auth/verify-email?token=` | Verify-email page |
| `POST /auth/resend-verification` | Register success UI |
| `POST /auth/logout` | Header / account / settings |
| `POST /auth/refresh` | Axios 401 interceptor (cookie) |

### UI complete, data local/mock

Catalog, PDP, cart, checkout, coupons, wishlist, recently viewed, account (profile Redux-only, addresses, orders, notifications, coupons, returns/exchanges, reviews list), guest confirmation, track-order (member local only), contact/newsletter (success-only), forgot/reset/change password (simulated delays).

### Explicit non-goals in frontend

- No admin UI / vendor dashboard
- No affiliate marketing
- Google OAuth button **disabled** (no SDK/callback)
- No Socket.IO / live dashboards
- Static marketing/legal pages (about, FAQs, policies, store, size guide) — code-managed

---

## 3. Page inventory (source of truth)

| Route | Purpose | Auth | Data today | Backend required |
|-------|---------|------|------------|------------------|
| `/` | Home merchandising + newsletter | Public | Bundled products; newsletter local | Catalog merchandising; `POST /newsletter` |
| `/shop` | Filtered/sorted/paginated catalog | Public | Local | `GET /products` |
| `/category/[slug]` | men/women collection | Public | Local | Collection-scoped product list |
| `/new-arrivals` | `isNew` catalog | Public | Local | `GET /products?isNew=true` |
| `/sale` | Sale catalog | Public | Local | `GET /products?onSale=true` |
| `/search` | Full-text search | Public | Local | `GET /search` or products `query` |
| `/product/[slug]` | PDP variants, reviews, related | Public | Local + Redux | Product detail, stock, reviews, related |
| `/cart` | Lines + shipping estimate | Public | Redux | Quote/pricing; optional server cart |
| `/checkout` | Address, coupon, payment, place order | Public | Local | Authoritative checkout + order create |
| `/order-confirmation` | Guest receipt | Public | sessionStorage | Secure guest order lookup |
| `/wishlist` | Saved products | Public | Redux | Optional server wishlist |
| `/track-order` | Status by order number | Public UI; member data | Local orders | Secure track (guest+member) |
| `/login` | Login + remember me | Public | Live API | Done (harden) |
| `/register` | Signup + resend verify | Public | Live API | Done |
| `/verify-email` | Consume token | Public | Live API | Done |
| `/forgot-password` | Request reset | Public | Simulated | Forgot-password + email |
| `/reset-password` | Reset via code | Public | Simulated | Reset-password |
| `/account` | Dashboard summary | Member | Local + Redux | Summary aggregates |
| `/account/profile` | Edit names; phone discarded | Member | Redux | `GET/PATCH /users/me` |
| `/account/password` | Change password | Member | Simulated | Change-password |
| `/account/addresses` | Shipping addresses | Member | localStorage | Address CRUD |
| `/account/orders` | Order history | Member | localStorage | `GET /orders` |
| `/account/orders/[id]` | Order detail + timeline | Member | localStorage | `GET /orders/:id` |
| `/account/wishlist` | Same wishlist, account chrome | Member | Redux | Same as wishlist |
| `/account/notifications` | Inbox + mark all read | Member | Seeded local | Notifications APIs |
| `/account/coupons` | Available/used coupons | Member | Seeded local | `GET /coupons/mine` |
| `/account/reviews` | Review history (empty) | Member | localStorage | Own reviews list + create |
| `/account/returns` | Return requests | Member | localStorage | Returns APIs |
| `/account/exchanges` | Exchange requests | Member | localStorage | Returns with `type=exchange` |
| `/account/support` | Contact links | Member | Static | Optional tickets |
| `/account/settings` | Prefs + clear local + logout | Member | Component state | Prefs + logout |
| `/about` `/faqs` `/returns` `/shipping` `/privacy` `/terms` `/store` `/size-guide` `/contact` | Content | Public | Static / local form | Contact/newsletter only for forms |

Account routes: client-side `AccountShell` redirect only — no Next middleware yet.

---

## 4. Domain entities (exact frontend shapes)

### Auth user (`types/auth.ts`)

- `id`, `email`, `phone?` (E.164 BD), `role: SUPER_ADMIN | ADMIN | CUSTOMER`, `firstName?`, `lastName?`

### Catalog (`features/products/types.ts`)

- **Product:** id, name, slug, price (BDT number), compareAtPrice?, category, subcategory?, brand?, collection (`men|women|unisex`), color, colors[], sizes[], image, images[], description?, variants[], inStock?, rating?, reviewCount?, reviews[], isNew?, onSale?
- **Variant:** id, size, color, stock, sku — **no per-variant price**
- **Review:** id, author, rating, title, body, createdAt, verified?
- **Filters:** collections, categories, subcategories, brands, sizes, colors, min/max price, availability, discount, minRating, query
- **Sort:** featured | newest | price-asc | price-desc | rating | discount
- **Pagination:** page, pageSize (8), total, totalPages (offset-style)

### Cart

- Line key: `(productId, variantId)` + size, color, quantity
- Prices resolved live from catalog (not snapshotted in cart)
- Shipping: ৳120 standard; 0 if empty or `forceFree` (FREESHIP)

### Checkout / order (`features/account/storage.ts`)

- **PaymentMethod:** `cod | bkash | card`
- **OrderStatus:** pending | confirmed | processing | shipped | delivered | cancelled | returned
- **CustomerOrder:** id, number (`EA…`), createdAt, status, items (snapshotted), subtotal, shipping, discount, total, couponCode?, shippingAddress, paymentMethod, trackingNumber?, timeline[]
- Checkout collects email + notes but **does not** put them on the order object today — backend must persist both

### Address

- label, fullName, phone, line1, line2?, city, district, postalCode, country=`Bangladesh`, isDefault, type `shipping|billing`
- UI only creates shipping; billing type unused

### Coupons

- code, title, description, discountType `percent|fixed`, value, minOrder, expiresAt, used
- Seeded: `ELEVATE10` (10%, min ৳1500), `FREESHIP` (fixed 120 + forceFree shipping — **double-benefit bug**)

### Returns / exchanges

- orderId, orderNumber, reason, status `pending|approved|rejected|completed`, type `return|exchange`
- Policy text (not enforced in UI): 7 days from delivery; unworn + tags; sale = exchange only

### Notifications / reviews / preferences

- Notification: title, body, createdAt, read, href?
- AccountReview: productId/name/slug, rating, title, body, createdAt — **no create UI on order detail yet**
- Settings: orderUpdates, marketing — **not persisted**

---

## 5. Business workflows (frontend)

### Registration → verify → login

1. Register (firstName, lastName, email, BD phone, password) → no session
2. “Check inbox” + optional resend verification
3. Click emailed link → `/verify-email?token=` → activate
4. Login → accessToken in Redux + refresh cookie

### Browse → cart → checkout

1. Filter/sort/search → PDP (variant stock) → add to cart / wishlist
2. Cart shows lines + ৳120 shipping estimate
3. Checkout: shipping fields (defaults Dhaka/Dhaka/1203), payment method, optional coupon if logged in
4. Place order → client builds order (status `confirmed`, fake tracking) → clear cart
5. Member → `/account/orders/:id?confirmed=1`; guest → `/order-confirmation` (session only)

### Account post-purchase

Orders list/detail → track (member) → returns/exchanges forms → coupons list → notifications → profile/password/settings

### Password recovery (UI only)

Forgot (email) → simulated success → Reset (manual 4–12 char code + new password) → simulated success

---

## 6. Hardcoded business rules (must move server-side)

1. Currency: BDT / ৳ (integer display)
2. Shipping: ৳120 nationwide; free when subtotal 0 or FREESHIP
3. Delivery copy: Dhaka 1–3 days; outside 3–5 days
4. Returns: 7 days from delivery; sale items exchange-only
5. Coupons require authentication
6. Percent discounts round to integer taka; fixed capped at subtotal
7. Country fixed Bangladesh
8. Default payment COD
9. Catalog page size 8; search dialog limit 6; recently viewed 12
10. No tax in UI
11. Password: min 12, upper + lower + digit
12. Phone: BD mobile 013–019, normalize to E.164

### Known frontend defects to fix in backend design

| Defect | Backend rule |
|--------|--------------|
| FREESHIP = ৳120 discount **and** free shipping | One reward: free shipping **or** fixed amount — not both |
| Coupon `expiresAt` never checked | Enforce expiry server-side |
| Cart ignores stock limits | Enforce + reserve at checkout |
| Client invents totals/IDs/status | Server authoritative |
| Guest cannot track | Public track with order number + email/phone |
| Checkout email/notes dropped | Persist on order |
| Profile phone discarded | Persist via `/users/me` |

---

## 7. Inferred API surface (frontend contract)

Auth (live): register, login, verify-email, resend-verification, refresh, logout.

Still required for parity with UI:

| Area | Methods |
|------|---------|
| Auth completion | forgot-password, reset-password, change-password |
| Profile | `GET/PATCH /users/me`, preferences |
| Catalog | products list/detail/related/new/sale, search, categories, brands |
| Cart (if server) | CRUD + merge on login |
| Wishlist (if server) | CRUD |
| Coupons | validate, mine |
| Checkout/orders | quote optional, `POST /orders` (+ Idempotency-Key), list, detail, track |
| Payments | COD state now; bKash/card init + webhooks later |
| Addresses | CRUD + set default |
| Notifications | list, mark read / read-all |
| Reviews | public list on PDP; create + mine |
| Returns | create/list (type return\|exchange) |
| Comms | `POST /contact`, `POST /newsletter` |

Response envelope (CLAUDE.md / backend interceptor):

```json
{ "success": true, "message": "…", "data": {}, "meta": {} }
```

---

## 8. Roles & permissions (from typed frontend + backend)

| Role | Storefront | Backend |
|------|------------|---------|
| `CUSTOMER` | All account commerce | Own resources only |
| `ADMIN` | No UI yet | Customers + business resources; cannot manage admins |
| `SUPER_ADMIN` | No UI yet | Unrestricted; only role that manages admins |

Platform is **single-merchant**. No vendor role/UI.

---

## 9. Open clarifications (block implementation)

See roadmap **§ Acceptance gate** and the architect questions in the chat. Highest priority:

1. Password reset: emailed **link token** vs UI **manual code**?
2. Guest order tracking proof (email vs phone vs signed token)?
3. Server cart/wishlist merge vs keep device-local Redux?
4. COD-only until gateways, or stub bKash/card as pending payment?
5. Money storage: integer taka vs poisha (×100)?
6. FREESHIP semantics confirmation
7. Remember-me: browser-only vs longer refresh TTL?
8. Reviews: enforce delivered purchase only when create UI ships?

---

## Evidence sources

- `frontend/app/**` (all pages)
- `frontend/features/{auth,account,cart,products}/**`
- `frontend/store/**`, `frontend/services/api-client.ts`
- `PROJECT_OVERVIEW.md`, `backend/prisma/schema.prisma`

*Last updated: 2026-07-18.*

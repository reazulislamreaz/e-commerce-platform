# CLAUDE.md

> Enterprise Engineering Guide for AI Coding Assistants

## Purpose

This repository uses **NestJS** for the backend and **Next.js (App Router)** for the frontend.

Before making any change, the AI assistant **must read this file completely** and follow every rule.

After reading this guide, read [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) completely to understand the repository's current architecture, implementation status, and local workflow.

**Do not write or modify code until the mandatory pre-coding flow below is complete.**

The primary goal is to produce **production-ready, scalable, secure, maintainable, and high-performance software**.

---

# Mandatory Pre-Coding Flow (Read Before Every Change)

Every AI assistant **must** complete this flow **before** inspecting files for a task, designing a solution, or writing code. Skipping steps leads to duplicate logic, broken architecture, and non-production-ready output.

## Step 1 — Read project context (required)

1. Read this file (`CLAUDE.md`) completely.
2. Read [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) completely.
3. Confirm what is **implemented** vs **planned** — do not treat mock/local data or UI stubs as live backend features.

## Step 2 — Inspect before you build (required)

1. Read the existing module, page, feature folder, and related files — do not assume structure.
2. Search for reusable components, hooks, utilities, services, and patterns already in the repo.
3. Identify the correct data-access layer (see **Frontend Data Access Rules** below) — never bypass it.
4. Check sibling pages/components for UI and naming conventions to match.

## Step 3 — Design with production constraints (required)

Before writing code, explicitly consider:

- Separation of concerns and single responsibility
- Backend integration path (repository/API layer, not hardcoded page logic)
- Loading, empty, error, and success states — see **Premium Loading Experience (Mandatory)**
- Perceived performance: skeleton layout fidelity, streaming, SWR caching, prefetch (not optional polish)
- Performance (Server Components first, minimal client boundaries, no unnecessary re-renders)
- Security, validation, and type safety
- Elevate Apparel brand theme compliance
- Accessibility (WCAG), SEO (metadata, semantic HTML), and responsive behavior
- Whether existing code should be **refactored** instead of duplicated

## Step 4 — Implement with minimal, focused diffs

- Reuse and extend existing code; do not reimplement what already exists.
- Remove dead code, unused imports, and duplicate logic when touched — do not leave cleanup for later.
- Preserve existing functionality, UI, and UX unless the task explicitly changes them.
- No `console.log`, commented-out code, temporary debug code, or unused assets/dependencies.

## Step 5 — Self-review and quality gates (required before handoff)

Run applicable checks and fix failures:

```bash
npm run lint --workspace=frontend
npm run lint --workspace=backend
npm run build --workspace=frontend
npm run build --workspace=backend
```

Also verify: no direct bypass of feature APIs, no new global state without justification, no breaking changes, no secrets committed, and **premium loading** standards met for any touched storefront route (see **Premium Loading Experience (Mandatory)**).

---

# Production Readiness Standards

Treat every change as if preparing for **large-scale production deployment**. Apply these standards to all new and modified code.

## Code quality

- Clean, readable, consistently styled code
- Feature-first folder structure; logical separation of UI, hooks, services, and utilities
- SOLID, DRY, KISS — no unnecessary complexity
- Proper naming; no duplicate components or parallel implementations of the same logic
- Strict TypeScript — no `any`, no disabled lint rules unless justified

## Remove unnecessary code

When working in an area, remove (do not accumulate):

- Dead code, unused components, hooks, utilities, imports, variables
- Duplicate logic and redundant CSS
- Unused assets and dependencies
- Console logs, debug code, and commented-out blocks
- Obsolete files that are no longer referenced

Keep only code that is actively used or intentionally part of the public feature API.

## Performance (frontend)

See **Premium Loading Experience (Mandatory)** — loading is a core requirement, not optional polish.

- Prefer Server Components; use `'use client'` only when needed
- Use dynamic imports, Suspense, and route-based splitting where appropriate
- Optimize images and fonts; avoid shipping entire catalogs to the client when server filtering/pagination is possible
- Memoize only when it prevents real re-render cost; avoid premature optimization
- Use efficient list rendering, event handlers, and TanStack Query cache settings

## Premium Loading Experience (Mandatory)

Treat **perceived performance** as a first-class requirement for every storefront page, component, and data-fetching flow. Users should rarely notice loading — the experience should feel near-instant (reference quality: premium apparel shops such as Fabrilife). This is **not** an optional enhancement.

### Non-negotiable UX rules

- **Never** ship a blank content area while data loads unless technically impossible.
- **Never** use a generic full-page skeleton when a **page-specific** skeleton exists or should exist.
- **Never** use bare spinners for primary page content — use **pixel-perfect skeleton screens** that match the final layout (zero CLS).
- **Always** provide loading, empty, and error states for user-facing fetches.
- **Keep previous data visible** while refetching (filters, pagination, sort) — subtle opacity only, no full skeleton flash.
- **Images** fade in naturally (`ProductImage` pattern); reserve aspect ratio / dimensions up front.
- Loading motion must be **subtle, premium, and on-brand** (gold shimmer via `Skeleton` in `frontend/components/common/skeleton.tsx`).

### Required techniques (use what applies)

| Technique                   | When                                             | Where in this repo                                                                                      |
| --------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Route `loading.tsx`         | Every App Router segment with async work         | `frontend/app/**/loading.tsx` — must match final page layout                                            |
| Page skeleton library       | Reuse before inventing                           | `frontend/components/loading/` (`ShopPageSkeleton`, `HomePageSkeleton`, `CatalogSectionSkeleton`, etc.) |
| Suspense boundaries         | Stream above-the-fold first; defer heavy fetches | Homepage sections, shop/sale hero + catalog, search/category catalog                                    |
| TanStack Query SWR          | Lists, search, filters, PDP client refetch       | `placeholderData: (prev) => prev`, catalog `staleTime` / `gcTime` in `features/products/query.ts`       |
| SSR dehydrate + hydrate     | First paint for catalog routes                   | `dehydrateProductList`, `QueryHydration`                                                                |
| Route prefetch              | Likely next navigation                           | `RoutePrefetcher`, `PrefetchNavLink`, `usePrefetchProduct`                                              |
| Optimistic / local-first UI | Cart, wishlist, mutations                        | Redux projection + server sync with rollback/`flashMessage`                                             |
| Segment `error.tsx`         | Recover without root crash                       | `frontend/app/{shop,checkout,account}/error.tsx`                                                        |
| Dynamic import + skeleton   | Heavy client-only UI (search dialog, etc.)       | `dynamic(..., { loading: () => … })`                                                                    |

### Skeleton fidelity checklist (every new or changed page)

1. Identify the **final rendered layout** (hero, toolbar, sidebar, grid, forms, aside summary).
2. Add or extend a skeleton in `frontend/components/loading/` with **the same DOM structure and dimensions**.
3. Wire the route’s `loading.tsx` (and Suspense `fallback` if the page streams sections) to that skeleton — **not** `PageShellSkeleton` unless the page is truly a generic shell.
4. Verify **no layout shift** when real content replaces the skeleton (CLS).
5. Verify filter/sort/page changes **do not** blank the product grid when cached data exists.

### Caching and prefetch defaults

- Global Query defaults: `frontend/providers/app-providers.tsx` (`CATALOG_STALE_MS`, `CATALOG_GC_MS`).
- Seed PDP cache from list/search results: `seedProductDetails` in `features/products/hooks.ts`.
- Prefetch storefront routes on idle and nav hover — extend `STOREFRONT_ROUTES` / `PrefetchNavLink` when adding high-traffic pages.
- Use `createClientId()` (`frontend/lib/client-id.ts`) for client ids on non-HTTPS hosts — do not call `crypto.randomUUID()` without a fallback.

### Pages that must maintain premium loading (including but not limited to)

Home, shop, category, sale, new arrivals, search, PDP, cart, checkout, wishlist, account (all sub-routes), auth, track order, order confirmation, contact, and admin surfaces touched by the task.

When adding a **new route**, ship `loading.tsx` + skeleton in the **same PR** as the page — no follow-up “loading pass.”

### Anti-patterns (reject in review)

- One shared skeleton for every route
- Awaiting all API calls before rendering any static chrome
- Replacing the entire grid with a skeleton on filter change when `placeholderData` can keep the prior page visible
- Full-page “Loading…” text for catalog or account surfaces
- Introducing spinners as the primary loading metaphor for page content

## Backend readiness (frontend architecture)

The frontend must stay ready for real REST API integration:

| Layer          | Rule                                                                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API client** | Use `frontend/services/api-client.ts` — never ad-hoc fetch in components                                                                                                    |
| **Products**   | Import from `@/features/products` (barrel). Server: sync getters; Client: `hooks.ts` + `productCatalog`. Do **not** import `@/features/products/data` from pages/components |
| **Account**    | Use `accountRepository` from `@/features/account` — swap local for HTTP later; do not call `storage.ts` from UI                                                             |
| **Auth**       | Use `features/auth/api.ts` + hooks — wire mutations with loading/error states                                                                                               |
| **Responses**  | Use `types/api.ts` helpers (`unwrapData`, pagination meta types)                                                                                                            |
| **Lists**      | Support pagination, filtering, sorting, and search via the repository/API layer — design for cursor pagination                                                              |

When adding commerce features, implement **vertically**: schema → DTO → service → API → frontend repository/hooks → UI.

## State management

| Data type                                     | Owner                                  |
| --------------------------------------------- | -------------------------------------- |
| Auth session, cart, wishlist, recently viewed | Redux (`frontend/store/`)              |
| Server/API data                               | TanStack Query (`features/*/hooks.ts`) |
| Local UI state                                | Component `useState`                   |

Rules:

- No unnecessary global state
- No duplicated data across Redux and Query
- Use shared selectors from `frontend/store/selectors.ts`
- Invalidate or update Query cache after mutations

## Component reusability

- Extract shared UI into `components/common`, `components/shared`, or feature folders
- Design composable props; avoid copy-paste page implementations
- Abstract repeated logic into hooks or utilities
- Match existing header, footer, form-field, and auth patterns

## UI consistency

Every storefront and admin surface must follow **Elevate Apparel Brand Theme (Mandatory)** — spacing, typography, colors, buttons, inputs, cards, icons, radii, and responsive behavior. Do not invent new palettes, fonts, or dark-default themes.

## Future scalability

Design so the app can support without major refactors:

- Large product catalogs and high traffic
- Authentication and RBAC
- Orders, payments, wishlist, reviews, inventory, coupons, notifications
- Additional modules via new feature folders and repository implementations

## Best practices checklist

- **Accessibility:** semantic HTML, labels, focus management, dialog `role="dialog"` + `aria-modal`, descriptive `alt` text
- **SEO:** per-route `metadata` / `generateMetadata`, Open Graph images, sitemap updates, JSON-LD on product pages where applicable
- **Loading / UX:** premium skeletons, Suspense streaming, SWR list updates, prefetch — see **Premium Loading Experience (Mandatory)**
- **Errors:** error boundaries, user-facing error states, no silent failures on submit flows
- **Validation:** Zod + React Hook Form on forms; DTOs + ValidationPipe on APIs
- **Security:** no secrets in code; validate and sanitize all input

## Refactor when you find issues

If existing code is inefficient, duplicated, poorly structured, not reusable, inconsistent, or likely to break when the backend connects — **refactor it in the same change** while preserving functionality and UI. Do not add new bypasses around bad patterns.

---

# Core Principles

- Think before coding.
- Understand the entire feature.
- Never assume requirements.
- Ask questions if requirements are ambiguous.
- Reuse existing code whenever possible.
- Prefer maintainability over cleverness.
- Keep backward compatibility unless explicitly instructed.
- Follow SOLID, DRY, KISS.
- Optimize for long-term maintainability.

---

# Tech Stack

## Backend

- NestJS
- TypeScript
- MongoDB (Mongoose) and/or PostgreSQL (Prisma)
- Redis
- BullMQ
- JWT
- Swagger

## Frontend

- Next.js App Router
- React
- TypeScript
- TanStack Query
- Tailwind CSS

---

# Elevate Apparel Brand Theme (Mandatory)

This is the **canonical visual system** for the storefront **and** admin dashboard. Every page, layout, form, modal, and marketing surface **must** follow it. Do not invent a new palette, font stack, or visual mood.

**Approved reference:** the Home Page light design. Match homepage / auth / header / admin shell patterns.

Source of truth in code:

- `frontend/app/globals.css` — CSS variables
- `frontend/lib/design-system.ts` — `DS` tokens + `btnPrimary` / `btnSecondary` / `cardShell`
- `frontend/app/layout.tsx`, `frontend/lib/fonts.ts`

Prefer theme tokens / Tailwind theme colors over one-off hex when possible; when hardcoding is already the pattern on a page, match the values below exactly.

## Brand mood

- Premium modern apparel — light, clean, luxury-inspired
- Off-white page surfaces with black text and gold accents
- High contrast, generous whitespace, minimal chrome
- Editorial but not newspaper; luxury without purple, neon glow, or dark-default UI

## Fonts

| Role                            | Family                             | CSS / Tailwind                   |
| ------------------------------- | ---------------------------------- | -------------------------------- |
| Primary UI                      | **Geist Sans**                     | `--font-geist-sans`, `font-sans` |
| Editorial / display (sparingly) | **Playfair Display** (500/600/700) | `--font-playfair`, `font-serif`  |
| Mono (code / rare UI)           | **Geist Mono**                     | `--font-geist-mono`, `font-mono` |

Rules:

- Body and most UI: Geist Sans
- Do **not** introduce Inter, Roboto, Arial-as-brand, or system-ui as the primary brand face
- Playfair is for selective editorial moments only — never drown the UI in serif
- Prefer uppercase + tight tracking for nav, CTAs, and section eyebrows (`tracking-[.08em]`–`[.2em]`, `text-[10px]`–`text-xs`, `font-semibold` / `font-bold`)

## Canonical palette (do not drift)

| Role           | Hex       | Notes                                  |
| -------------- | --------- | -------------------------------------- |
| Background     | `#FAFAFA` | Page / shell background                |
| Primary text   | `#111111` | Headings, body, icons (default)        |
| Secondary text | `#555555` | Muted copy, placeholders, hints        |
| Accent / brand | `#C9A227` | Active nav, links hover, prices, focus |
| Accent hover   | `#D4B03A` | Gold hover states                      |
| Border         | `#E5E7EB` | Inputs, cards, dividers                |
| Cards / panels | `#FFFFFF` | Elevated surfaces                      |

Do **not** introduce additional primary colors. Do **not** revive the old dark palette (`#0a0a0b`, `#111110`, `#1a1815`, `#e3bb78`, etc.) on storefront or admin surfaces.

## Color tokens (`globals.css`)

| Token                                       | Hex       | Use                       |
| ------------------------------------------- | --------- | ------------------------- |
| `--background` / `--color-surface`          | `#fafafa` | Page background           |
| `--foreground` / `--color-ink`              | `#111111` | Primary text              |
| `--color-muted`                             | `#555555` | Secondary text            |
| `--color-card` / `--color-surface-2`        | `#ffffff` | Cards / elevated          |
| `--color-surface-3`                         | `#f4f4f5` | Subtle elevated / headers |
| `--color-edge` / `--color-border`           | `#e5e7eb` | Borders                   |
| `--color-gold` / `--color-gold-dark`        | `#c9a227` | Brand accent              |
| `--color-gold-light` / `--color-gold-hover` | `#d4b03a` | Accent hover              |

Helpers: import `DS`, `btnPrimary`, `btnSecondary`, `cardShell` from `frontend/lib/design-system.ts`.

## Logo (mandatory)

Use the shared `BrandLogo` component (`frontend/components/shared/brand-logo.tsx`) everywhere — do not inline ad-hoc logo images or gold “E” boxes.

| Variant prop     | Asset                                | Use on                                         |
| ---------------- | ------------------------------------ | ---------------------------------------------- |
| `on="light"`     | transparent dark ink + gold wordmark | Navbar, auth, admin, light pages               |
| `on="dark"`      | transparent white + gold wordmark    | Footer, dark heroes/banners, dark email chrome |
| `variant="mark"` | transparent monogram only            | Compact chrome (e.g. collapsed admin sidebar)  |

Rules:

- Transparent background only — never place the logo inside a fixed black/white rectangle
- Keep proportions via `object-contain` + height utilities (`h-6` / `h-7` / `h-8`); never stretch
- One branding system — do not invent alternate logo styles

## Buttons (mandatory)

**Primary**

- Default: background `#111111`, text white
- Hover: background `#C9A227`, text `#111111`

**Secondary**

- Default: white background, `#111111` border and text
- Hover: `#111111` background, white text

Reuse `btnPrimary` / `btnSecondary` or match these classes exactly. Do not use gold-fill as the default primary CTA.

## Forms

- Inputs: white background, `#111111` text, `#E5E7EB` border, gold focus (`#C9A227`)
- Labels: `#111111`
- Placeholders: `#555555`
- Validation: soft red (`border-red-200` / `bg-red-50` / `text-red-600` or `text-red-700`)

Shared pattern: `frontend/components/common/form-field.tsx` (storefront); `AdminInput` / `AdminField` in `frontend/components/admin/admin-ui.tsx` (admin).

## Cards, tables, icons

- **Cards:** white, light border `#E5E7EB`, soft shadow, sharp radii (`rounded-[4px]`–`rounded-lg`), elegant hover
- **Tables:** white body, grey header (`#F4F4F5`), black text, light borders
- **Icons:** default `#111111`; hover / active `#C9A227`

## Navbar & footer

**Navbar (storefront + admin top bar)**

- Background `#FAFAFA`, sticky, soft shadow
- Text / icons `#111111`
- Active / hover accent `#C9A227` / `#D4B03A`

**Footer (storefront only — intentional exception)**

- Black background, white text
- Gold headings (`#C9A227`)
- Grey secondary text
- Preserve layout and content; do not restyle the footer to light

## Notifications / toasts

| Tone    | Style                                          |
| ------- | ---------------------------------------------- |
| Success | Soft green (`bg-green-50`, `border-green-200`) |
| Warning | Soft gold (`bg-[#FFF8E7]`, border `#E8D9A8`)   |
| Error   | Soft red (`bg-red-50`, `border-red-200`)       |
| Info    | Soft blue (`bg-blue-50`, `border-blue-200`)    |

## Layout & components

- Max content width: **1400px** (`max-w-[1400px]` / `--container-8xl`)
- Radii: small and sharp — typically `rounded-[4px]`–`rounded-lg`, not pill-heavy
- Focus rings: gold (`outline-[#C9A227]` / `ring-[#C9A227]/20`)
- Icons: Lucide, stroke ~1.5–1.7
- Imagery: apparel photography; WebP/AVIF; never purple gradients or cream broadsheet looks
- Admin uses the same light palette via `frontend/components/admin/*`

## Do / Don't

**Do**

- Keep pages light-first (`#FAFAFA`) with black text and gold accents
- Reuse header, form-field, auth, homepage, and admin-shell patterns
- Use the same gold for active nav, prices, focus rings, and accent hovers
- Keep the storefront footer dark (approved exception)

**Don't**

- Reintroduce dark-mode storefront or admin as the default
- Introduce purple/indigo/glow “AI default” themes
- Replace Geist / Playfair with generic stacks
- Use gold-fill buttons as the primary CTA (black → gold hover is required)
- Drift hex values — copy the palette above

---

# NestJS Standards

## Architecture

Always use feature modules.

Feature/

- module
- controller
- service
- repository
- dto
- entities/schema
- interfaces
- decorators
- guards
- interceptors
- pipes
- filters
- tests

Controllers:

- Receive requests
- Call services
- Return responses

Never place business logic in controllers.

Services contain business logic.

Repositories handle database access.

Always use dependency injection.

Never instantiate services manually.

---

## DTO

Always validate requests with DTOs.

Use:

- class-validator
- class-transformer
- ValidationPipe

Never accept raw request bodies.

---

## Validation

Validate:

- body
- params
- query
- headers when necessary

Reject invalid requests early.

---

## Guards

Authentication:

- JWT Guard

Authorization:

- Roles Guard
- Permission Guard

Never authorize inside controllers.

---

## Exception Handling

Use a global exception filter.

Never expose stack traces.

Always return consistent API responses.

---

## Interceptors

Use for:

- logging
- serialization
- response transformation
- caching
- timeout

---

## Swagger

Every endpoint should include:

- summary
- description
- request dto
- response dto
- authentication
- error responses

---

# Next.js Standards

Use App Router.

Prefer Server Components.

Use Client Components only when required.

Use:

- dynamic imports
- Suspense with **layout-matched** fallbacks (not generic placeholders)
- route `loading.tsx` per segment
- lazy loading
- metadata API
- image optimization and reserved media dimensions

Use TanStack Query for client-side server state — **always** consider `placeholderData`, `staleTime`, prefetch, and dehydrate/hydrate for catalog flows.

Avoid unnecessary client fetching.

See **Premium Loading Experience (Mandatory)**.

---

# TypeScript

Always enable strict typing.

Avoid any.

Use interfaces, utility types, generics.

No disabled lint rules unless justified.

---

# Database

Always optimize queries.

Use:

- indexes
- select/projection
- filtering
- sorting
- pagination

Never fetch unused fields.

MongoDB:

- lean()
- indexes
- aggregation only when needed

Prisma:

- select
- minimal include
- transactions

Avoid N+1 queries.

---

# Pagination

Prefer cursor pagination.

Fallback to offset pagination.

---

# Performance

Assume:

- millions of users
- millions of records

Optimize:

- CPU
- memory
- network
- database

Use Promise.all() where independent.

---

# Redis

Cache expensive reads.

Never cache mutable data without invalidation.

---

# BullMQ

Move heavy jobs to queues:

- emails
- notifications
- reports
- image processing

---

# Security

Always:

- validate input
- sanitize input
- protect JWT secrets
- use environment variables
- implement RBAC
- prevent SQL/NoSQL injection
- prevent XSS
- configure CORS
- rate limit sensitive APIs

Never commit secrets.

---

# Logging

Use NestJS Logger or Pino.

Never log:

- passwords
- tokens
- secrets

---

# REST API

Use predictable endpoints.

Return:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": {}
}
```

---

# Folder Structure

Keep feature-first organization.

Do not create random folders.

---

# Testing

Write unit tests for business logic.

Write integration tests for APIs.

---

# Docker

Use multi-stage builds.

Small images.

Non-root user when possible.

---

# CI/CD

Before merge:

- lint
- tests
- build
- typecheck

must pass.

---

# AI Workflow (Summary)

This is a short summary. The authoritative checklist is **Mandatory Pre-Coding Flow** and **Production Readiness Standards** above — follow those before every change.

1. Complete the mandatory pre-coding flow (read docs → inspect existing code → design → implement → self-review).
2. Follow production readiness standards (code quality, performance, backend-ready architecture, state rules, UI consistency).
3. Run lint and build for affected workspaces before handoff.
4. Refactor issues you touch — do not leave duplicate or bypass patterns for a later pass.

---

# Final Checklist

- Clean Architecture
- NestJS conventions
- Next.js best practices
- Elevate Apparel brand theme (light `#FAFAFA` + black text + gold `#C9A227`; dark footer exception)
- Premium loading experience (page skeletons, SWR, prefetch, no blank flashes)
- Strict TypeScript
- DTO validation
- Repository pattern
- Optimized queries
- Proper indexes
- Pagination
- Security
- Logging
- Swagger updated
- Tests updated
- Production ready

---

# Final Rule

Always behave like a Senior Staff Software Engineer.

Do not optimize for speed of writing.

Optimize for correctness, scalability, maintainability, and long-term engineering quality.

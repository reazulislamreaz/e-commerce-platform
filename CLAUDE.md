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
- Loading, empty, error, and success states
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

Also verify: no direct bypass of feature APIs, no new global state without justification, no breaking changes, no secrets committed.

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

- Prefer Server Components; use `'use client'` only when needed
- Use dynamic imports, Suspense, and route-based splitting where appropriate
- Optimize images and fonts; avoid shipping entire catalogs to the client when server filtering/pagination is possible
- Memoize only when it prevents real re-render cost; avoid premature optimization
- Use efficient list rendering, event handlers, and TanStack Query cache settings
- Provide loading skeletons or states where user-facing fetches occur

## Backend readiness (frontend architecture)

The frontend must stay ready for real REST API integration:

| Layer | Rule |
|-------|------|
| **API client** | Use `frontend/services/api-client.ts` — never ad-hoc fetch in components |
| **Products** | Import from `@/features/products` (barrel). Server: sync getters; Client: `hooks.ts` + `productCatalog`. Do **not** import `@/features/products/data` from pages/components |
| **Account** | Use `accountRepository` from `@/features/account` — swap local for HTTP later; do not call `storage.ts` from UI |
| **Auth** | Use `features/auth/api.ts` + hooks — wire mutations with loading/error states |
| **Responses** | Use `types/api.ts` helpers (`unwrapData`, pagination meta types) |
| **Lists** | Support pagination, filtering, sorting, and search via the repository/API layer — design for cursor pagination |

When adding commerce features, implement **vertically**: schema → DTO → service → API → frontend repository/hooks → UI.

## State management

| Data type | Owner |
|-----------|--------|
| Auth session, cart, wishlist, recently viewed | Redux (`frontend/store/`) |
| Server/API data | TanStack Query (`features/*/hooks.ts`) |
| Local UI state | Component `useState` |

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

Every storefront surface must follow **Elevate Apparel Brand Theme (Mandatory)** — spacing, typography, colors, buttons, inputs, cards, icons, radii, and responsive behavior. Do not introduce new palettes, fonts, or light-default themes.

## Future scalability

Design so the app can support without major refactors:

- Large product catalogs and high traffic
- Authentication and RBAC
- Orders, payments, wishlist, reviews, inventory, coupons, notifications
- Additional modules via new feature folders and repository implementations

## Best practices checklist

- **Accessibility:** semantic HTML, labels, focus management, dialog `role="dialog"` + `aria-modal`, descriptive `alt` text
- **SEO:** per-route `metadata` / `generateMetadata`, Open Graph images, sitemap updates, JSON-LD on product pages where applicable
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

This is the **canonical visual system** for the storefront. Every page, layout, form, modal, and marketing surface **must** follow it. Do not invent a new palette, font stack, or visual mood.

Source of truth in code: `frontend/app/globals.css`, `frontend/app/layout.tsx`, `frontend/lib/fonts.ts`. Prefer theme tokens / Tailwind theme colors over one-off hex when possible; when hardcoding is already the pattern on a page, match the values below exactly.

## Brand mood

- Premium dark streetwear / apparel
- Near-black surfaces with champagne-gold accents
- High contrast, moody photography, minimal chrome
- Editorial but not newspaper; luxury without purple or neon glow

## Fonts

| Role | Family | CSS / Tailwind |
|------|--------|----------------|
| Primary UI | **Geist Sans** | `--font-geist-sans`, `font-sans` |
| Editorial / display (sparingly) | **Playfair Display** (500/600/700) | `--font-playfair`, `font-serif` |
| Mono (code / rare UI) | **Geist Mono** | `--font-geist-mono`, `font-mono` |

Rules:

- Body and most UI: Geist Sans
- Do **not** introduce Inter, Roboto, Arial-as-brand, or system-ui as the primary brand face
- Playfair is for selective editorial moments only — never drown the UI in serif
- Prefer uppercase + tight tracking for nav, CTAs, and section eyebrows (`tracking-[.08em]`–`[.2em]`, `text-[10px]`–`text-xs`, `font-semibold` / `font-bold`)

## Color tokens (`globals.css`)

| Token | Hex | Use |
|-------|-----|-----|
| `--background` / `--color-surface` | `#0a0a0b` | Page background |
| `--foreground` | `#f4f4f5` | Primary text |
| `--color-surface-2` | `#141416` | Elevated dark surface |
| `--color-surface-3` | `#1d1d21` | Higher elevation |
| `--color-edge` | `#27272a` | Subtle borders |
| `--color-gold` | `#d4af37` | Classic gold token |
| `--color-gold-light` | `#e6c860` | Lighter gold |
| `--color-gold-dark` | `#b8962e` | Darker gold |
| `--color-ink` | `#111827` | Dark ink (badges / contrast) |

## In-product accent palette (homepage / auth — match these)

Champagne gold accents used across live UI (keep consistency):

| Role | Hex |
|------|-----|
| Gold primary / links / accents | `#e3bb78` |
| Gold eyebrow / soft accent | `#e0bd7d` |
| Gold CTA fill | `#e5bd79` / `#e5bd78` |
| Gold CTA border | `#efc677` |
| Gold hover | `#eec98a` |
| Gold on dark outline buttons | `#efce91` / `#d3b06f` |
| Deep black page / hero | `#090909` / `black` |
| Card / panel surface | `#111110` |
| Input surface | `#1a1815` |
| Border warm dark | `#2d2a27` / `#37332c` / `#292929` |
| Muted text | `#b5b0a8` / `#8b867d` |
| Soft light text | `#eee9e1` / `#e9e5de` / `#f1eee9` |
| Text on gold CTA | `#18120b` |
| Product card image ground | `#e4e3e1` |

## Layout & components

- Max content width: **1400px** (`max-w-[1400px]` / `--container-8xl`)
- Radii: small and sharp — typically `rounded-[4px]`–`rounded-lg`, not pill-heavy
- Primary CTA: gold fill + dark text, uppercase, bold, compact padding
- Secondary CTA: transparent / dark with light border
- Focus rings: gold (`outline-[#e3bb78]` / `ring-[#e3bb78]/15`)
- Icons: Lucide, stroke ~1.5–1.7, gold accents where highlighted
- Imagery: dark, moody apparel photography; WebP/AVIF; never purple gradients or cream broadsheet looks

## Do / Don't

**Do**

- Keep pages dark-first with gold accents
- Reuse header/footer, form-field, and auth art-panel patterns
- Use the same gold for links, active nav underline, prices, and CTAs

**Don't**

- Switch to light mode as the default brand experience
- Introduce purple/indigo/glow “AI default” themes
- Replace Geist / Playfair with generic stacks
- Use large card grids with heavy shadows as the default marketing language
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
- Suspense
- lazy loading
- metadata API
- image optimization

Use TanStack Query for client-side server state.

Avoid unnecessary client fetching.

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
- Elevate Apparel brand theme (colors, fonts, dark + gold UI)
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

# CLAUDE.md

> Enterprise Engineering Guide for AI Coding Assistants

## Purpose

This repository uses **NestJS** for the backend and **Next.js (App Router)** for the frontend.

Before making any change, the AI assistant **must read this file completely** and follow every rule.

After reading this guide, read [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) completely to understand the repository's current architecture, implementation status, and local workflow.

The primary goal is to produce **production-ready, scalable, secure, maintainable, and high-performance software**.

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

# AI Workflow

Before coding:

1. Read the existing module.
2. Understand architecture.
3. Search for reusable code.
4. Design implementation.
5. Consider edge cases.
6. Optimize queries.
7. Consider indexing.
8. Consider security.
9. Write code.
10. Self-review.
11. Ensure lint/build/typecheck pass.

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

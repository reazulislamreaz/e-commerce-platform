# Repository Agent Instructions

Before inspecting, modifying, or reviewing this repository:

1. Read [CLAUDE.md](./CLAUDE.md) completely — it is the mandatory engineering guide.
2. Read [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) completely — current architecture and what is actually implemented.
3. **Complete the Mandatory Pre-Coding Flow in CLAUDE.md before writing any code.**

Do not skip straight to implementation. Every agent must read the rules, inspect existing code, and follow the production-readiness standards defined in CLAUDE.md.

## Mandatory pre-coding flow (summary)

| Step | Action |
|------|--------|
| 1 | Read `CLAUDE.md` + `PROJECT_OVERVIEW.md` |
| 2 | Inspect existing modules; search for reusable code and patterns |
| 3 | Use the correct data layer — `@/features/products`, `@/features/account`, `api-client.ts` — never bypass repositories |
| 4 | Design for production: loading/error/empty states, backend integration path, performance, a11y, SEO, brand theme |
| 5 | Implement minimal focused diffs; remove dead code when touched |
| 6 | Self-review; run lint + build for affected workspaces |

Full rules: **Mandatory Pre-Coding Flow** and **Production Readiness Standards** in [CLAUDE.md](./CLAUDE.md).

## Frontend data access (do not bypass)

- **Products:** `@/features/products` — not `@/features/products/data` from pages/components
- **Account:** `@/features/account` (`accountRepository` + hooks) — not `storage.ts` from UI
- **Auth:** `features/auth/api.ts` + hooks
- **HTTP:** `frontend/services/api-client.ts` only

## State ownership

- **Redux** — auth, cart, wishlist, recently viewed (client-only)
- **TanStack Query** — all server/API state
- **Local state** — UI-only (`useState`)

## Before handoff

- Lint and build pass for changed workspaces
- No duplicate logic, dead code, console logs, or architecture bypasses introduced
- Storefront UI matches Elevate Apparel dark + gold theme

## Elevate Apparel brand theme (mandatory)

All storefront pages and UI must follow the **Elevate Apparel** dark + champagne-gold theme defined in [CLAUDE.md](./CLAUDE.md) under **Elevate Apparel Brand Theme (Mandatory)**.

Quick reference:

- **Mood:** premium dark streetwear — near-black surfaces, champagne-gold accents, high contrast
- **Fonts:** Geist Sans (UI), Playfair Display (editorial only), Geist Mono (rare)
- **Surfaces:** `#0a0a0b` / `#090909` / `#111110` / `#1a1815`
- **Gold accents:** `#e3bb78`, `#e0bd7d`, `#e5bd79` (CTA), hover `#eec98a`
- **Text:** primary `#f4f4f5` / white; muted `#b5b0a8`; on-gold CTA text `#18120b`
- **Borders:** `#2d2a27`, `#37332c`, `#292929`
- **Layout:** max width `1400px`; sharp small radii (`rounded-[4px]`); uppercase compact CTAs
- **Tokens:** `frontend/app/globals.css` (`--color-gold`, `--color-surface*`, fonts)

Do not invent new palettes, font stacks, or light-default marketing themes. Match existing homepage, auth, header, and footer patterns.

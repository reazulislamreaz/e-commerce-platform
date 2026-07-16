# Repository Agent Instructions

Before inspecting, modifying, or reviewing this repository, read [CLAUDE.md](./CLAUDE.md) completely and follow it as the mandatory engineering guide.

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

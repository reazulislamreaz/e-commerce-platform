/**
 * Helpers for preserving a user's intended destination across authentication.
 *
 * When a guest hits a protected feature (or chooses to sign in mid-checkout),
 * we send them to `/login?next=<path>` and return them exactly where they were
 * after a successful login/register. Centralizes the `next` query convention so
 * every entry point (header, checkout, middleware-parity, account shell) stays
 * consistent and safe against open-redirects.
 */

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

/** True when the path is one of the auth screens (never a valid `next` target). */
export function isAuthPath(path: string): boolean {
  const clean = path.split('?')[0];
  return AUTH_PATHS.some((authPath) => clean === authPath || clean.startsWith(`${authPath}/`));
}

/**
 * Returns a safe internal path to redirect to after auth, or `null` when the
 * candidate is missing, external, an auth screen, or the bare homepage (which
 * is already the default landing target, so it needs no `next`).
 */
export function sanitizeNext(next: string | null | undefined): string | null {
  if (!next) return null;
  // Only same-origin absolute paths; reject protocol-relative ("//host") and external URLs.
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  if (next === '/') return null;
  if (isAuthPath(next)) return null;
  return next;
}

/** Builds `/login`, optionally carrying a sanitized `next` destination. */
export function loginHref(next?: string | null): string {
  const safe = sanitizeNext(next);
  return safe ? `/login?next=${encodeURIComponent(safe)}` : '/login';
}

/** Builds `/register`, optionally carrying a sanitized `next` destination. */
export function registerHref(next?: string | null): string {
  const safe = sanitizeNext(next);
  return safe ? `/register?next=${encodeURIComponent(safe)}` : '/register';
}

/** Resolves where to send the user after a successful login/register. */
export function resolvePostAuthPath(next: string | null | undefined, fallback = '/'): string {
  return sanitizeNext(next) ?? fallback;
}

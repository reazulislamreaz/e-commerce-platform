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

function withAuthParams(
  base: '/login' | '/register',
  next?: string | null,
  reason?: string | null,
) {
  const params = new URLSearchParams();
  const safe = sanitizeNext(next);
  if (safe) params.set('next', safe);
  if (reason) params.set('reason', reason);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/** Builds `/login`, optionally carrying a sanitized `next` destination and a reason. */
export function loginHref(next?: string | null, reason?: string | null): string {
  return withAuthParams('/login', next, reason);
}

/** Builds `/register`, optionally carrying a sanitized `next` destination and a reason. */
export function registerHref(next?: string | null, reason?: string | null): string {
  return withAuthParams('/register', next, reason);
}

/** Resolves where to send the user after a successful login/register. */
export function resolvePostAuthPath(next: string | null | undefined, fallback = '/'): string {
  return sanitizeNext(next) ?? fallback;
}

/**
 * Friendly, feature-specific prompts shown on the auth screens when a guest is
 * redirected from a protected feature. Falls back to a generic prompt for any
 * reason not listed here (keeps future protected features working without edits).
 */
const AUTH_REASON_MESSAGES: Record<string, string> = {
  wishlist: 'Please sign in to save items to your wishlist.',
  account: 'Please sign in to access your account.',
  orders: 'Please sign in to view your orders.',
  addresses: 'Please sign in to manage your saved addresses.',
  profile: 'Please sign in to manage your profile.',
  review: 'Please sign in to write a review.',
  reorder: 'Please sign in to reorder previous purchases.',
  loyalty: 'Please sign in to view your rewards.',
  checkout: 'Sign in for faster checkout, or continue as a guest.',
};

const GENERIC_AUTH_MESSAGE = 'Please sign in to continue.';

/**
 * Resolves the prompt to show on the login/register screens. A known `reason`
 * wins; otherwise a bare `next` (came from a protected route) shows the generic
 * prompt; with neither, no banner is shown.
 */
export function authPromptMessage(
  reason: string | null | undefined,
  next?: string | null,
): string | null {
  if (reason) return AUTH_REASON_MESSAGES[reason] ?? GENERIC_AUTH_MESSAGE;
  return next ? GENERIC_AUTH_MESSAGE : null;
}

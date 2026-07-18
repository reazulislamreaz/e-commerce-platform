import { NextResponse, type NextRequest } from 'next/server';

const AUTH_HINT_COOKIE = 'elevate_auth_hint';

/**
 * Soft gate for account routes. Full auth is enforced by the API (Bearer JWT).
 * Middleware redirects clearly anonymous browser sessions that have neither a
 * refresh cookie nor a client auth hint set on login.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/account')) return NextResponse.next();

  const hasRefresh = Boolean(request.cookies.get('refresh_token')?.value);
  const hasLocalHint = request.cookies.get(AUTH_HINT_COOKIE)?.value === '1';

  if (hasRefresh || hasLocalHint) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/account/:path*'],
};

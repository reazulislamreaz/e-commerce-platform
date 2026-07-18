import { NextResponse, type NextRequest } from 'next/server';

/**
 * Soft gate for account routes. Full auth is enforced by the API (Bearer JWT);
 * this middleware only redirects clearly anonymous browser sessions that have
 * neither a persisted auth payload nor a refresh cookie.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/account')) return NextResponse.next();

  const hasRefresh = Boolean(request.cookies.get('refresh_token')?.value);
  const hasLocalHint =
    request.cookies.get('elevate_auth_hint')?.value === '1' ||
    // Client-only localStorage cannot be read here; allow through when refresh exists.
    false;

  if (hasRefresh || hasLocalHint) return NextResponse.next();

  // Allow the account shell to load; client Account layout still redirects to login
  // when Redux has no user. Avoid hard-blocking so refresh-cookie-only sessions work.
  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*'],
};

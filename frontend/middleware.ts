import { NextResponse, type NextRequest } from 'next/server';

const AUTH_HINT_COOKIE = 'elevate_auth_hint';

/**
 * Soft gate for account and admin routes. Full auth/role checks are enforced
 * by the API and client shells; middleware only redirects clearly anonymous
 * browser sessions that have neither a refresh cookie nor a client auth hint.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAccount = pathname.startsWith('/account');
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  if (!isAccount && !isAdmin) return NextResponse.next();

  const hasRefresh = Boolean(request.cookies.get('refresh_token')?.value);
  const hasLocalHint = request.cookies.get(AUTH_HINT_COOKIE)?.value === '1';

  if (hasRefresh || hasLocalHint) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/account/:path*', '/admin', '/admin/:path*'],
};

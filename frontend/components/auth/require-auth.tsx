'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type PropsWithChildren, type ReactNode } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectAuthHydrated, selectAuthUser } from '@/store/selectors';
import { loginHref } from '@/lib/auth-redirect';

type RequireAuthProps = PropsWithChildren<{
  /** Feature key used for the friendly login prompt (e.g. `wishlist`). */
  reason?: string;
  /** Layout-matched skeleton shown while auth hydrates or during redirect. */
  fallback?: ReactNode;
}>;

/**
 * Client-side gate for protected storefront routes/features. Complements the
 * edge middleware soft-gate: once auth state hydrates, unauthenticated users are
 * sent to the login screen with the current location preserved as `next` (so
 * they return exactly where they were) plus a `reason` for a friendly prompt.
 * Renders `fallback` until authenticated to avoid any protected-content flash.
 */
export function RequireAuth({ children, reason, fallback = null }: RequireAuthProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppSelector(selectAuthUser);
  const hydrated = useAppSelector(selectAuthHydrated);

  useEffect(() => {
    if (!hydrated || user) return;
    const search = typeof window !== 'undefined' ? window.location.search : '';
    router.replace(loginHref(`${pathname}${search}`, reason));
  }, [hydrated, user, router, pathname, reason]);

  if (!hydrated || !user) return <>{fallback}</>;
  return <>{children}</>;
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { ComponentProps } from 'react';
import { prefetchStorefrontRoute } from '@/providers/route-prefetcher';

const PREFETCH_PATHS = new Set([
  '/shop',
  '/sale',
  '/new-arrivals',
  '/category/men',
  '/category/women',
]);

/** Next.js Link with idle catalog/route prefetch on hover/focus for storefront nav. */
export function PrefetchNavLink({
  href,
  onMouseEnter,
  onFocus,
  ...props
}: ComponentProps<typeof Link>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const path = typeof href === 'string' ? href : href.pathname ?? '';

  return (
    <Link
      href={href}
      prefetch
      onMouseEnter={(e) => {
        if (PREFETCH_PATHS.has(path)) {
          prefetchStorefrontRoute(path, router, queryClient);
        }
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        if (PREFETCH_PATHS.has(path)) {
          prefetchStorefrontRoute(path, router, queryClient);
        }
        onFocus?.(e);
      }}
      {...props}
    />
  );
}

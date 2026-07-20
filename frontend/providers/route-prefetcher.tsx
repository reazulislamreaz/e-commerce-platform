'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { productCatalog } from '@/features/products/api';
import { productKeys } from '@/features/products/keys';
import { CATALOG_STALE_MS } from '@/features/products/query';
import { PAGE_SIZE } from '@/features/products/constants';

const STOREFRONT_ROUTES = [
  '/shop',
  '/sale',
  '/new-arrivals',
  '/category/men',
  '/category/women',
] as const;

/**
 * Warm likely navigation targets after idle — mirrors Fabrilife-style instant shop transitions.
 */
export function RoutePrefetcher() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    const warm = () => {
      if (cancelled) return;
      for (const href of STOREFRONT_ROUTES) {
        router.prefetch(href);
      }
      void queryClient.prefetchQuery({
        queryKey: productKeys.facets(),
        queryFn: () => productCatalog.facets(),
        staleTime: CATALOG_STALE_MS,
      });
      void queryClient.prefetchQuery({
        queryKey: productKeys.list({ page: 1, pageSize: PAGE_SIZE, sort: 'featured' }),
        queryFn: () => productCatalog.list({ page: 1, pageSize: PAGE_SIZE, sort: 'featured' }),
        staleTime: CATALOG_STALE_MS,
      });
    };

    const scheduleWarm = () => {
      if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(warm, { timeout: 4000 });
        return () => {
          cancelled = true;
          window.cancelIdleCallback(id);
        };
      }
      const timer = window.setTimeout(warm, 1500);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    };

    return scheduleWarm();
  }, [router, queryClient]);

  return null;
}

/** Prefetch route + default catalog cache on nav hover/focus. */
export function prefetchStorefrontRoute(
  href: string,
  router: ReturnType<typeof useRouter>,
  queryClient: ReturnType<typeof useQueryClient>,
) {
  router.prefetch(href);
  if (href === '/shop' || href.startsWith('/category/')) {
    void queryClient.prefetchQuery({
      queryKey: productKeys.facets(),
      queryFn: () => productCatalog.facets(),
      staleTime: CATALOG_STALE_MS,
    });
  }
  if (href === '/sale') {
    void queryClient.prefetchQuery({
      queryKey: productKeys.list({ filters: { discount: true }, page: 1, pageSize: PAGE_SIZE }),
      queryFn: () => productCatalog.onSale(),
      staleTime: CATALOG_STALE_MS,
    });
  }
}

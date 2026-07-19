'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { CatalogProduct, ProductFilters, ProductSort } from './types';
import { productCatalog, type ProductFacets, type ProductPage } from './api';
import { productKeys } from './keys';
import { CATALOG_GC_MS, CATALOG_STALE_MS } from './query';

export { productKeys };

function normalizeIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

export function seedProductDetails(
  queryClient: ReturnType<typeof useQueryClient>,
  products: CatalogProduct[],
) {
  for (const product of products) {
    const existing = queryClient.getQueryData<CatalogProduct>(productKeys.detail(product.slug));
    if (!existing || !existing.variants?.length) {
      queryClient.setQueryData(productKeys.detail(product.slug), product);
    }
  }
}

export function useProductList(
  params: {
    filters?: Partial<ProductFilters>;
    sort?: ProductSort;
    page?: number;
    pageSize?: number;
  },
  options?: {
    enabled?: boolean;
    /** Only pass when params match the SSR snapshot — never reuse across filter/page keys. */
    initialData?: ProductPage;
  },
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productCatalog.list(params),
    enabled: options?.enabled,
    initialData: options?.initialData,
    placeholderData: (previous) => previous,
    staleTime: CATALOG_STALE_MS,
    gcTime: CATALOG_GC_MS,
  });

  useEffect(() => {
    if (query.data?.items?.length) {
      seedProductDetails(queryClient, query.data.items);
    }
  }, [query.data, queryClient]);

  return query;
}

export function useProductSearch(query: string, enabled = true) {
  const queryClient = useQueryClient();
  const result = useQuery({
    queryKey: productKeys.search(query),
    queryFn: () => productCatalog.search(query),
    enabled: enabled && query.trim().length > 0,
    staleTime: 60_000,
    gcTime: CATALOG_GC_MS,
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    if (result.data?.length) {
      seedProductDetails(queryClient, result.data);
    }
  }, [result.data, queryClient]);

  return result;
}

export function useProductBySlug(slug: string, options?: { initialData?: CatalogProduct | null }) {
  return useQuery({
    queryKey: productKeys.detail(slug),
    queryFn: () => productCatalog.getBySlug(slug),
    enabled: Boolean(slug),
    initialData: options?.initialData ?? undefined,
    staleTime: CATALOG_STALE_MS,
    gcTime: CATALOG_GC_MS,
  });
}

export function useRelatedProducts(slug: string, enabled = true) {
  return useQuery({
    queryKey: productKeys.related(slug),
    queryFn: async () => {
      const product = await productCatalog.getBySlug(slug);
      if (!product) return [];
      return productCatalog.related(product);
    },
    enabled: enabled && Boolean(slug),
    staleTime: CATALOG_STALE_MS,
    gcTime: CATALOG_GC_MS,
    placeholderData: (previous) => previous,
  });
}

export function useProductsByIds(ids: string[], enabled = true) {
  const normalized = normalizeIds(ids);
  return useQuery({
    queryKey: productKeys.byIds(normalized),
    queryFn: () => productCatalog.getByIds(normalized),
    enabled: enabled && normalized.length > 0,
    staleTime: CATALOG_STALE_MS,
    gcTime: CATALOG_GC_MS,
    placeholderData: (previous) => previous,
  });
}

export function useProductFacets(options?: { enabled?: boolean; initialData?: ProductFacets }) {
  return useQuery({
    queryKey: productKeys.facets(),
    queryFn: () => productCatalog.facets(),
    staleTime: CATALOG_STALE_MS,
    gcTime: CATALOG_GC_MS,
    enabled: options?.enabled,
    initialData: options?.initialData,
  });
}

/** Prefetch product detail + route on hover / focus / viewport. */
export function usePrefetchProduct() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const prefetched = useRef(new Set<string>());

  return useCallback(
    (slug: string) => {
      if (!slug || prefetched.current.has(slug)) return;
      prefetched.current.add(slug);
      router.prefetch(`/product/${slug}`);
      void queryClient.prefetchQuery({
        queryKey: productKeys.detail(slug),
        queryFn: () => productCatalog.getBySlug(slug),
        staleTime: CATALOG_STALE_MS,
      });
      void queryClient.prefetchQuery({
        queryKey: productKeys.related(slug),
        queryFn: async () => {
          const product = await productCatalog.getBySlug(slug);
          if (!product) return [];
          return productCatalog.related(product);
        },
        staleTime: CATALOG_STALE_MS,
      });
    },
    [queryClient, router],
  );
}

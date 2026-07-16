'use client';

import { useQuery } from '@tanstack/react-query';
import type { ProductFilters, ProductSort } from './types';
import { productCatalog } from './api';

export const productKeys = {
  all: ['products'] as const,
  list: (params: unknown) => [...productKeys.all, 'list', params] as const,
  detail: (slug: string) => [...productKeys.all, 'detail', slug] as const,
  search: (q: string) => [...productKeys.all, 'search', q] as const,
};

export function useProductList(params: {
  filters?: Partial<ProductFilters>;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productCatalog.list(params),
  });
}

export function useProductSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: productKeys.search(query),
    queryFn: () => productCatalog.search(query),
    enabled: enabled && query.trim().length > 0,
  });
}

export function useProductBySlug(slug: string) {
  return useQuery({
    queryKey: productKeys.detail(slug),
    queryFn: () => productCatalog.getBySlug(slug),
    enabled: Boolean(slug),
  });
}

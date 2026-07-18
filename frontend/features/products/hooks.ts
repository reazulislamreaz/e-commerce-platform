'use client';

import { useQuery } from '@tanstack/react-query';
import type { ProductFilters, ProductSort } from './types';
import { productCatalog, type ProductFacets, type ProductPage } from './api';

export const productKeys = {
  all: ['products'] as const,
  list: (params: unknown) => [...productKeys.all, 'list', params] as const,
  detail: (slug: string) => [...productKeys.all, 'detail', slug] as const,
  search: (q: string) => [...productKeys.all, 'search', q] as const,
  byIds: (ids: string[]) => [...productKeys.all, 'by-ids', ids] as const,
  facets: () => [...productKeys.all, 'facets'] as const,
};

export function useProductList(params: {
  filters?: Partial<ProductFilters>;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}, options?: { enabled?: boolean; initialData?: ProductPage }) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productCatalog.list(params),
    enabled: options?.enabled,
    initialData: options?.initialData,
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

export function useProductsByIds(ids: string[], enabled = true) {
  return useQuery({
    queryKey: productKeys.byIds(ids),
    queryFn: () => productCatalog.getByIds(ids),
    enabled: enabled && ids.length > 0,
  });
}

export function useProductFacets(options?: { enabled?: boolean; initialData?: ProductFacets }) {
  return useQuery({
    queryKey: productKeys.facets(),
    queryFn: () => productCatalog.facets(),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled,
    initialData: options?.initialData,
  });
}

export const productKeys = {
  all: ['products'] as const,
  list: (params: unknown) => [...productKeys.all, 'list', params] as const,
  detail: (slug: string) => [...productKeys.all, 'detail', slug] as const,
  related: (slug: string) => [...productKeys.all, 'related', slug] as const,
  search: (q: string) => [...productKeys.all, 'search', q] as const,
  byIds: (ids: string[]) => [...productKeys.all, 'by-ids', [...ids].sort()] as const,
  facets: () => [...productKeys.all, 'facets'] as const,
};

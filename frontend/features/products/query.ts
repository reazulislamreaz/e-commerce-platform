import { QueryClient, dehydrate, type DehydratedState } from '@tanstack/react-query';
import { productCatalog, type ProductFacets, type ProductPage } from './api';
import { productKeys } from './keys';
import type { CatalogProduct, ProductFilters, ProductSort } from './types';

const CATALOG_STALE_MS = 5 * 60 * 1000;
const CATALOG_GC_MS = 30 * 60 * 1000;

export function createCatalogQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: CATALOG_STALE_MS,
        gcTime: CATALOG_GC_MS,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export async function dehydrateProductList(params: {
  filters?: Partial<ProductFilters>;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
  facets?: boolean;
}): Promise<{
  state: DehydratedState;
  result: ProductPage;
  facets?: ProductFacets;
}> {
  const client = createCatalogQueryClient();
  const listParams = {
    filters: params.filters,
    sort: params.sort ?? 'featured',
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 8,
  };

  const [result, facets] = await Promise.all([
    client.fetchQuery({
      queryKey: productKeys.list(listParams),
      queryFn: () => productCatalog.list(listParams),
      staleTime: CATALOG_STALE_MS,
    }),
    params.facets === false
      ? Promise.resolve(undefined)
      : client.fetchQuery({
          queryKey: productKeys.facets(),
          queryFn: () => productCatalog.facets(),
          staleTime: CATALOG_STALE_MS,
        }),
  ]);

  for (const item of result.items) {
    client.setQueryData(productKeys.detail(item.slug), item);
  }

  return { state: dehydrate(client), result, facets };
}

export async function dehydrateProductDetail(slug: string): Promise<{
  state: DehydratedState;
  product: CatalogProduct | null;
}> {
  const client = createCatalogQueryClient();
  const product = await client.fetchQuery({
    queryKey: productKeys.detail(slug),
    queryFn: () => productCatalog.getBySlug(slug),
    staleTime: CATALOG_STALE_MS,
  });

  if (product) {
    void client.prefetchQuery({
      queryKey: productKeys.related(product.slug),
      queryFn: () => productCatalog.related(product),
      staleTime: CATALOG_STALE_MS,
    });
  }

  return { state: dehydrate(client), product };
}

export { CATALOG_STALE_MS, CATALOG_GC_MS };

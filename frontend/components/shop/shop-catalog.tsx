'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import type { CatalogProduct, ProductFilters, ProductSort } from '@/features/products/types';
import type { ProductFacets, ProductPage } from '@/features/products';
import { useProductFacets, useProductList } from '@/features/products';
import {
  DEFAULT_FILTERS,
  filterProducts,
  getFilterFacets,
  paginateProducts,
  sortProducts,
} from '@/features/products/filter';
import { PAGE_SIZE } from '@/features/products/constants';
import {
  catalogStateToSearchParams,
  parseCatalogSearchParams,
  restoreCatalogScroll,
  saveCatalogScroll,
} from '@/features/products/url-state';
import { CatalogToolbar, ProductGrid } from '@/components/shared/product-grid';
import { ProductGridSkeleton } from '@/components/common/skeleton';
import { FilterPanel, MobileFilterDrawer } from '@/components/shop/filter-panel';
import { cn } from '@/lib/utils';

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'discount', label: 'Biggest Discount' },
];
const EMPTY_PRODUCTS: CatalogProduct[] = [];

function clearedFilters(
  current: ProductFilters,
  initialFilters?: Partial<ProductFilters>,
): ProductFilters {
  return {
    ...DEFAULT_FILTERS,
    collections: initialFilters?.collections ?? [],
    discount: Boolean(initialFilters?.discount),
    query: current.query,
  };
}

export function ShopCatalog({
  products,
  title = 'All Products',
  initialFilters,
  remote = false,
  initialResult,
  initialFacets,
}: {
  products?: CatalogProduct[];
  title?: string;
  initialFilters?: Partial<ProductFilters>;
  remote?: boolean;
  initialResult?: ProductPage;
  initialFacets?: ProductFacets;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { filters, sort, page } = useMemo(
    () => parseCatalogSearchParams(new URLSearchParams(searchParams.toString()), initialFilters),
    [searchParams, initialFilters],
  );

  const listParams = useMemo(
    () => ({ filters, sort, page, pageSize: PAGE_SIZE }),
    [filters, sort, page],
  );

  const ssrSnapshotMatches =
    page === 1 &&
    sort === 'featured' &&
    JSON.stringify({ ...DEFAULT_FILTERS, ...initialFilters, query: filters.query }) ===
      JSON.stringify(filters);

  const localProducts = products ?? EMPTY_PRODUCTS;
  const remoteResult = useProductList(listParams, {
    enabled: remote,
    initialData: ssrSnapshotMatches ? initialResult : undefined,
  });
  const remoteFacets = useProductFacets({
    enabled: remote,
    initialData: initialFacets,
  });
  const localFacets = useMemo(() => getFilterFacets(localProducts), [localProducts]);
  const facets = remote ? (remoteFacets.data ?? localFacets) : localFacets;

  const filtered = useMemo(
    () => sortProducts(filterProducts(localProducts, filters), sort),
    [localProducts, filters, sort],
  );
  const localPage = useMemo(
    () => paginateProducts(filtered, page, PAGE_SIZE),
    [filtered, page],
  );
  const paged = remote ? (remoteResult.data ?? initialResult ?? localPage) : localPage;
  const count = remote ? paged.total : filtered.length;
  const isRefreshing = remote && remoteResult.isFetching && Boolean(remoteResult.data);
  const showSkeleton = remote && remoteResult.isLoading && !remoteResult.data && !initialResult;

  const pushState = (next: {
    filters?: ProductFilters;
    sort?: ProductSort;
    page?: number;
  }) => {
    const params = catalogStateToSearchParams({
      filters: next.filters ?? filters,
      sort: next.sort ?? sort,
      page: next.page ?? page,
    });
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  useEffect(() => {
    restoreCatalogScroll(pathname, searchParams.toString());
    return () => saveCatalogScroll(pathname, searchParams.toString());
  }, [pathname, searchParams]);

  return (
    <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
      <FilterPanel
        className="hidden lg:block"
        filters={filters}
        facets={facets}
        onChange={(next) => pushState({ filters: next, page: 1 })}
        onClear={() => pushState({ filters: clearedFilters(filters, initialFilters), page: 1 })}
      />

      <div>
        <CatalogToolbar title={title} count={count}>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#37332c] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[#eee9e1] lg:hidden"
            >
              <SlidersHorizontal className="size-3.5" strokeWidth={1.7} />
              Filters
            </button>
            <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[#b5b0a8]">
              Sort
              <select
                value={sort}
                onChange={(e) => pushState({ sort: e.target.value as ProductSort, page: 1 })}
                className="rounded-[4px] border border-[#37332c] bg-[#1a1815] px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-white outline-none focus:border-[#e3bb78]"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </CatalogToolbar>

        {remoteResult.isError ? (
          <div
            role="alert"
            className="rounded-[4px] border border-red-900/60 bg-red-950/30 p-5 text-sm text-red-300"
          >
            We couldn&apos;t load the catalog. Please try again.
          </div>
        ) : showSkeleton ? (
          <ProductGridSkeleton count={PAGE_SIZE} />
        ) : (
          <div
            className={cn(
              'transition-opacity duration-200 motion-reduce:transition-none',
              isRefreshing && 'opacity-70',
            )}
          >
            <ProductGrid
              products={paged.items}
              emptyMessage="No products match your filters. Try clearing some filters."
            />
          </div>
        )}

        {paged.totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={paged.page <= 1}
              onClick={() => pushState({ page: Math.max(1, paged.page - 1) })}
              className="rounded-[4px] border border-[#37332c] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white disabled:opacity-40"
            >
              Prev
            </button>
            {Array.from({ length: paged.totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => pushState({ page: n })}
                className={`min-w-9 rounded-[4px] border px-2.5 py-2 text-[11px] font-semibold ${
                  n === paged.page
                    ? 'border-[#e5bd79] bg-[#e5bd79] text-[#18120b]'
                    : 'border-[#37332c] text-white hover:border-[#e3bb78]'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={paged.page >= paged.totalPages}
              onClick={() => pushState({ page: Math.min(paged.totalPages, paged.page + 1) })}
              className="rounded-[4px] border border-[#37332c] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        )}
      </div>

      <MobileFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        facets={facets}
        onChange={(next) => pushState({ filters: next, page: 1 })}
        onClear={() => pushState({ filters: clearedFilters(filters, initialFilters), page: 1 })}
      />
    </div>
  );
}

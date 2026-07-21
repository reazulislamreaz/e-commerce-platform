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

/** Compact page list: 1 … window … last (avoids rendering every page button). */
function paginationItems(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) items.push('ellipsis');
  for (let n = start; n <= end; n += 1) items.push(n);
  if (end < totalPages - 1) items.push('ellipsis');
  items.push(totalPages);
  return items;
}

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
  const localPage = useMemo(() => paginateProducts(filtered, page, PAGE_SIZE), [filtered, page]);
  const paged = remote ? (remoteResult.data ?? initialResult ?? localPage) : localPage;
  const count = remote ? paged.total : filtered.length;
  const isRefreshing = remote && remoteResult.isFetching && Boolean(remoteResult.data);
  const showSkeleton = remote && remoteResult.isLoading && !remoteResult.data && !initialResult;

  const pushState = (next: { filters?: ProductFilters; sort?: ProductSort; page?: number }) => {
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
              className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#E5E7EB] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[#555555] lg:hidden"
            >
              <SlidersHorizontal className="size-3.5" strokeWidth={1.7} />
              Filters
            </button>
            <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[#555555]">
              Sort
              <select
                value={sort}
                onChange={(e) => pushState({ sort: e.target.value as ProductSort, page: 1 })}
                className="rounded-[4px] border border-[#E5E7EB] bg-white px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#111111] outline-none focus:border-[#C9A227]"
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
            className="rounded-[4px] border border-red-900/60 bg-red-950/30 p-5 text-sm text-red-700"
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
              className="rounded-[4px] border border-[#E5E7EB] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[#111111] disabled:opacity-40"
            >
              Prev
            </button>
            {paginationItems(paged.page, paged.totalPages).map((item, index) =>
              item === 'ellipsis' ? (
                <span
                  key={`ellipsis-${index}`}
                  className="min-w-9 px-1 text-center text-[11px] text-[#555555]"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => pushState({ page: item })}
                  aria-current={item === paged.page ? 'page' : undefined}
                  className={`min-w-9 rounded-[4px] border px-2.5 py-2 text-[11px] font-semibold ${
                    item === paged.page
                      ? 'border-[#C9A227] bg-[#C9A227] text-[#111111]'
                      : 'border-[#E5E7EB] text-[#111111] hover:border-[#C9A227]'
                  }`}
                >
                  {item}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={paged.page >= paged.totalPages}
              onClick={() => pushState({ page: Math.min(paged.totalPages, paged.page + 1) })}
              className="rounded-[4px] border border-[#E5E7EB] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[#111111] disabled:opacity-40"
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

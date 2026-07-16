'use client';

import { useMemo, useState, useTransition } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { CatalogProduct, ProductFilters, ProductSort } from '@/features/products/types';
import {
  filterProducts,
  getFilterFacets,
  paginateProducts,
  sortProducts,
} from '@/features/products/filter';
import { PAGE_SIZE } from '@/features/products/data';
import { CatalogToolbar, ProductGrid } from '@/components/shared/product-grid';
import { FilterPanel, MobileFilterDrawer, useShopFilters } from '@/components/shop/filter-panel';

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'discount', label: 'Biggest Discount' },
];

export function ShopCatalog({
  products,
  title = 'All Products',
  initialFilters,
}: {
  products: CatalogProduct[];
  title?: string;
  initialFilters?: Partial<ProductFilters>;
}) {
  const { filters, setFilters, clear, activeCount } = useShopFilters(initialFilters);
  const [sort, setSort] = useState<ProductSort>('featured');
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [, startTransition] = useTransition();

  const facets = useMemo(() => getFilterFacets(products), [products]);

  const filtered = useMemo(() => {
    const next = sortProducts(filterProducts(products, filters), sort);
    return next;
  }, [products, filters, sort]);

  const paged = useMemo(
    () => paginateProducts(filtered, page, PAGE_SIZE),
    [filtered, page],
  );

  const updateFilters = (next: ProductFilters) => {
    startTransition(() => {
      setFilters(next);
      setPage(1);
    });
  };

  return (
    <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
      <FilterPanel
        className="hidden lg:block"
        filters={filters}
        facets={facets}
        onChange={updateFilters}
        onClear={() => {
          clear();
          setPage(1);
        }}
      />

      <div>
        <CatalogToolbar title={title} count={filtered.length}>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#37332c] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[#eee9e1] lg:hidden"
            >
              <SlidersHorizontal className="size-3.5" strokeWidth={1.7} />
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
            <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[#b5b0a8]">
              Sort
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as ProductSort);
                  setPage(1);
                }}
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

        <ProductGrid
          products={paged.items}
          emptyMessage="No products match your filters. Try clearing some filters."
        />

        {paged.totalPages > 1 && (
          <nav
            aria-label="Pagination"
            className="mt-8 flex items-center justify-center gap-2"
          >
            <button
              type="button"
              disabled={paged.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-[4px] border border-[#37332c] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white disabled:opacity-40"
            >
              Prev
            </button>
            {Array.from({ length: paged.totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
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
              onClick={() => setPage((p) => Math.min(paged.totalPages, p + 1))}
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
        onChange={updateFilters}
        onClear={() => {
          clear();
          setPage(1);
        }}
      />
    </div>
  );
}

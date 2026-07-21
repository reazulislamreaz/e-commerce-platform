import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ShopCatalog } from '@/components/shop/shop-catalog';
import { CatalogSectionSkeleton } from '@/components/loading';
import { dehydrateProductList } from '@/features/products';
import { QueryHydration } from '@/providers/query-hydration';
import { PAGE_SIZE } from '@/features/products/constants';

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim();
  return {
    title: query ? `Search: ${query}` : 'Search',
    description: query
      ? `Find Elevate Apparel products matching “${query}”.`
      : 'Search the Elevate Apparel catalog for tees, hoodies, joggers, and more.',
    ...(query ? { robots: { index: false, follow: true } } : {}),
  };
}

async function SearchCatalog({ query }: { query: string }) {
  const filters = query ? { query } : undefined;
  const { state, result, facets } = await dehydrateProductList({
    filters,
    page: 1,
    pageSize: PAGE_SIZE,
    facets: true,
  });

  return (
    <QueryHydration state={state}>
      <ShopCatalog
        remote
        initialResult={result}
        initialFacets={facets}
        title={query ? 'Matching Products' : 'All Products'}
        initialFilters={filters}
      />
    </QueryHydration>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]">
      <section className="mx-auto max-w-[1400px] px-3 py-8 sm:px-6 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
          Search
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-[#111111]">
          {query ? `Results for “${query}”` : 'Search'}
        </h1>
        <div className="mt-8">
          <Suspense fallback={<CatalogSectionSkeleton count={8} />}>
            <SearchCatalog query={query} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

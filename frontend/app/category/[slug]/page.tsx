import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShopCatalog } from '@/components/shop/shop-catalog';
import { CatalogSectionSkeleton } from '@/components/loading';
import { dehydrateProductList } from '@/features/products';
import { QueryHydration } from '@/providers/query-hydration';
import { PAGE_SIZE } from '@/features/products/constants';

// Request-time render: the API is not reachable during `next build`.
export const dynamic = 'force-dynamic';

const collections = {
  men: {
    title: "Men's Pieces",
  },
  women: {
    title: "Women's Pieces",
  },
} as const;

type CollectionKey = keyof typeof collections;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const key = slug as CollectionKey;
  if (!(key in collections)) return { title: 'Collection' };
  const label = key === 'men' ? "Men's" : "Women's";
  return {
    title: `${label} Collection`,
    description: `Shop Elevate Apparel ${label.toLowerCase()} collection.`,
  };
}

async function CategoryCatalog({ collection }: { collection: CollectionKey }) {
  const filters = { collections: [collection] };
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
        title={collections[collection].title}
        initialFilters={filters}
      />
    </QueryHydration>
  );
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const key = slug as CollectionKey;
  if (!(key in collections)) notFound();

  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto max-w-[1400px] px-3 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={<CatalogSectionSkeleton count={8} />}>
          <CategoryCatalog collection={key} />
        </Suspense>
      </section>
    </main>
  );
}

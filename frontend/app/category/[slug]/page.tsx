import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShopCatalog } from '@/components/shop/shop-catalog';
import { productCatalog } from '@/features/products';

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

export function generateStaticParams() {
  return Object.keys(collections).map((slug) => ({ slug }));
}

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

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const key = slug as CollectionKey;
  if (!(key in collections)) notFound();

  const filters = { collections: [key] };
  const [initialResult, initialFacets] = await Promise.all([
    productCatalog.list({ filters, page: 1, pageSize: 8 }),
    productCatalog.facets(),
  ]);

  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto max-w-[1400px] px-3 py-8 sm:px-6 sm:py-10">
        <ShopCatalog
          remote
          initialResult={initialResult}
          initialFacets={initialFacets}
          title={collections[key].title}
          initialFilters={filters}
        />
      </section>
    </main>
  );
}

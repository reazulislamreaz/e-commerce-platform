import type { Metadata } from 'next';
import { ShopCatalog } from '@/components/shop/shop-catalog';
import { getAllProducts } from '@/features/products';

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

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const products = getAllProducts();

  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto max-w-[1400px] px-3 py-8 sm:px-6 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          Search
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-white">
          {query ? `Results for “${query}”` : 'Search'}
        </h1>
        <div className="mt-8">
          <ShopCatalog
            products={products}
            title={query ? 'Matching Products' : 'All Products'}
            initialFilters={query ? { query } : undefined}
          />
        </div>
      </section>
    </main>
  );
}

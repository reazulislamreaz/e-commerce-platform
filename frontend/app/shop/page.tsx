import type { Metadata } from 'next';
import { ShopCatalog } from '@/components/shop/shop-catalog';
import { productCatalog } from '@/features/products';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Shop premium Elevate Apparel — tees, hoodies, joggers, and essentials.',
};

export default async function ShopPage() {
  const [initialResult, initialFacets] = await Promise.all([
    productCatalog.list({ page: 1, pageSize: 8 }),
    productCatalog.facets(),
  ]);
  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto max-w-[1400px] px-3 py-8 sm:px-6 sm:py-10">
        <ShopCatalog
          remote
          initialResult={initialResult}
          initialFacets={initialFacets}
          title="All Products"
        />
      </section>
    </main>
  );
}

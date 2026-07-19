import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ShopCatalog } from '@/components/shop/shop-catalog';
import { CatalogPageSkeleton } from '@/components/common/skeleton';
import { productCatalog } from '@/features/products';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'New Arrivals',
  description: 'Fresh Elevate Apparel drops — just landed.',
};

export default async function NewArrivalsPage() {
  const products = await productCatalog.newArrivals();

  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="border-b border-[#2d2a27] bg-[#111110]">
        <div className="mx-auto flex max-w-[1400px] gap-0 overflow-x-auto px-3 sm:px-6">
          {['Drop 01 — Tees', 'Drop 02 — Hoodies', 'Drop 03 — Bottoms', 'Drop 04 — Essentials'].map(
            (label, i) => (
              <div
                key={label}
                className={`flex min-w-[180px] flex-1 items-center gap-3 px-4 py-4 text-[11px] font-semibold uppercase tracking-wide text-[#eee9e1] ${
                  i ? 'border-l border-[#2d2a27]' : ''
                }`}
              >
                <span className="text-[#e3bb78]">{String(i + 1).padStart(2, '0')}</span>
                {label.replace(/^Drop 0\d — /, '')}
              </div>
            ),
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-3 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={<CatalogPageSkeleton />}>
          <ShopCatalog products={products} title="Fresh Drops" />
        </Suspense>
      </section>
    </main>
  );
}

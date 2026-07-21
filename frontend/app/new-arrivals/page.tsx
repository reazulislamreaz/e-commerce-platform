import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ShopCatalog } from '@/components/shop/shop-catalog';
import { CatalogSectionSkeleton } from '@/components/loading';
import { productCatalog } from '@/features/products';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New Arrivals',
  description: 'Fresh Elevate Apparel drops — just landed.',
};

async function NewArrivalsCatalogSection() {
  const products = await productCatalog.newArrivals();
  return <ShopCatalog products={products} title="Fresh Drops" />;
}

export default function NewArrivalsPage() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]">
      <section className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-[1400px] gap-0 overflow-x-auto px-3 sm:px-6">
          {['Drop 01 — Tees', 'Drop 02 — Hoodies', 'Drop 03 — Bottoms', 'Drop 04 — Essentials'].map(
            (label, i) => (
              <div
                key={label}
                className={`flex min-w-[180px] flex-1 items-center gap-3 px-4 py-4 text-[11px] font-semibold uppercase tracking-wide text-[#555555] ${
                  i ? 'border-l border-[#E5E7EB]' : ''
                }`}
              >
                <span className="text-[#C9A227]">{String(i + 1).padStart(2, '0')}</span>
                {label.replace(/^Drop 0\d — /, '')}
              </div>
            ),
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-3 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={<CatalogSectionSkeleton count={8} />}>
          <NewArrivalsCatalogSection />
        </Suspense>
      </section>
    </main>
  );
}

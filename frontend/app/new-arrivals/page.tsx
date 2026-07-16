import type { Metadata } from 'next';
import { PageHero } from '@/components/shared/page-hero';
import { ShopCatalog } from '@/components/shop/shop-catalog';
import { getNewArrivals } from '@/features/products';

export const metadata: Metadata = {
  title: 'New Arrivals',
  description: 'Fresh Elevate Apparel drops — just landed.',
};

export default function NewArrivalsPage() {
  const products = getNewArrivals();

  return (
    <main id="main-content" className="flex-1 bg-black">
      <PageHero
        variant="centered"
        eyebrow="Just Landed"
        title={
          <>
            NEW <span className="text-[#e3bb78]">ARRIVALS</span>
          </>
        }
        description="The latest cuts, colors, and essentials — limited runs, built to elevate."
        image="/images/home/collection-new.webp"
        cta={{ href: '/shop', label: 'Browse Shop' }}
        secondaryCta={{ href: '/category/men', label: "Men's" }}
      />

      {/* Unique: numbered drop strip */}
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
        <ShopCatalog products={products} title="Fresh Drops" />
      </section>
    </main>
  );
}

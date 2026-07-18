import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/shared/page-hero';
import { ShopCatalog } from '@/components/shop/shop-catalog';
import { productCatalog } from '@/features/products';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sale',
  description: 'Elevate Apparel sale — up to 40% off select pieces.',
};

export default async function SalePage() {
  const products = await productCatalog.onSale();

  return (
    <main id="main-content" className="flex-1 bg-black">
      <PageHero
        variant="full"
        eyebrow="Limited Time"
        title={
          <>
            SALE <span className="text-[#e3bb78]">UP TO 40% OFF</span>
          </>
        }
        description="Select essentials at sharper prices. Elevate more — spend less."
        image="/images/home/collection-sale.webp"
        cta={{ href: '/shop', label: 'Shop All' }}
        secondaryCta={{ href: '/new-arrivals', label: 'New Arrivals' }}
      />

      {/* Unique: bold promo strip */}
      <section className="bg-[#e5bd79]">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-7">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-[#18120b]">
            Member tip — unlock exclusive sale drops first
          </p>
          <Link
            href="/register"
            className="border border-[#18120b] px-3 py-1.5 text-[10px] font-bold uppercase text-[#18120b] transition-colors hover:bg-[#18120b] hover:text-[#e5bd79]"
          >
            Join Elevate
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-3 py-8 sm:px-6 sm:py-10">
        <ShopCatalog
          products={products}
          title="On Sale"
          initialFilters={{ discount: true }}
        />
      </section>
    </main>
  );
}

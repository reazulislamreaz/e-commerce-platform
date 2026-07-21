import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/shared/page-hero';
import { ShopCatalog } from '@/components/shop/shop-catalog';
import { CatalogSectionSkeleton, PageHeroSkeleton } from '@/components/loading';
import { productCatalog } from '@/features/products';
import { marketingApi } from '@/features/marketing/api';
import {
  bannerToPageHero,
  FALLBACK_BANNERS,
  pickPrimaryBanner,
} from '@/features/marketing/banners';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sale',
  description: 'Elevate Apparel sale — up to 40% off select pieces.',
};

async function SaleHeroSection() {
  const banners = await marketingApi.listPublic('SALE_BANNER').catch(() => []);
  const banner = pickPrimaryBanner(banners, FALLBACK_BANNERS.SALE_BANNER);
  const hero = bannerToPageHero(banner, {
    secondaryCta: { href: '/new-arrivals', label: 'New Arrivals' },
  });

  return (
    <PageHero
      variant="full"
      eyebrow="Limited Time"
      title={hero.title}
      titleAccent={hero.titleAccent}
      description={hero.description}
      image={hero.image}
      mobileImage={hero.mobileImage}
      imageAlt={hero.imageAlt}
      cta={hero.cta}
      secondaryCta={hero.secondaryCta}
    />
  );
}

async function SaleCatalogSection() {
  const products = await productCatalog.onSale();
  return <ShopCatalog products={products} title="On Sale" initialFilters={{ discount: true }} />;
}

export default function SalePage() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]">
      <Suspense fallback={<PageHeroSkeleton variant="full" />}>
        <SaleHeroSection />
      </Suspense>

      <section className="bg-[#C9A227]">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-7">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-[#111111]">
            Member tip — unlock exclusive sale drops first
          </p>
          <Link
            href="/register"
            className="border border-[#111111] px-3 py-1.5 text-[10px] font-bold uppercase text-[#111111] transition-colors hover:bg-[#111111] hover:text-[#C9A227]"
          >
            Join Elevate
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-3 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={<CatalogSectionSkeleton count={8} />}>
          <SaleCatalogSection />
        </Suspense>
      </section>
    </main>
  );
}

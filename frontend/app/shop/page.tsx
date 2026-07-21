import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageHero } from '@/components/shared/page-hero';
import { ShopCatalog } from '@/components/shop/shop-catalog';
import { CatalogSectionSkeleton, PageHeroSkeleton } from '@/components/loading';
import { dehydrateProductList } from '@/features/products';
import { QueryHydration } from '@/providers/query-hydration';
import { PAGE_SIZE } from '@/features/products/constants';
import { marketingApi } from '@/features/marketing/api';
import {
  bannerToPageHero,
  FALLBACK_BANNERS,
  pickPrimaryBanner,
} from '@/features/marketing/banners';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Shop premium Elevate Apparel — tees, hoodies, joggers, and essentials.',
};

async function ShopHeroSection() {
  const banners = await marketingApi.listPublic('SHOP_BANNER').catch(() => []);
  const banner = pickPrimaryBanner(banners, FALLBACK_BANNERS.SHOP_BANNER);
  const hero = bannerToPageHero(banner);

  return (
    <PageHero
      variant="asymmetric"
      eyebrow={hero.eyebrow}
      title={hero.title}
      titleAccent={hero.titleAccent}
      description={hero.description}
      image={hero.image}
      mobileImage={hero.mobileImage}
      imageAlt={hero.imageAlt}
      cta={hero.cta}
    />
  );
}

async function ShopCatalogSection() {
  const { state, result, facets } = await dehydrateProductList({
    page: 1,
    pageSize: PAGE_SIZE,
    facets: true,
  });

  return (
    <QueryHydration state={state}>
      <ShopCatalog remote initialResult={result} initialFacets={facets} title="All Products" />
    </QueryHydration>
  );
}

export default function ShopPage() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]">
      <Suspense fallback={<PageHeroSkeleton variant="asymmetric" />}>
        <ShopHeroSection />
      </Suspense>
      <section className="mx-auto max-w-[1400px] px-3 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={<CatalogSectionSkeleton count={8} />}>
          <ShopCatalogSection />
        </Suspense>
      </section>
    </main>
  );
}

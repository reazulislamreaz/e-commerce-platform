import type { Metadata } from 'next';
import { PageHero } from '@/components/shared/page-hero';
import { ShopCatalog } from '@/components/shop/shop-catalog';
import { getAllProducts } from '@/features/products';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Shop premium Elevate Apparel — tees, hoodies, joggers, and essentials.',
};

export default function ShopPage() {
  const products = getAllProducts();

  return (
    <main id="main-content" className="flex-1 bg-black">
      <PageHero
        variant="full"
        eyebrow="The Full Edit"
        title="SHOP ALL"
        description="Minimal essentials and statement pieces — built to elevate every day."
        image="/images/home/hero.webp"
        imageAlt="Elevate Apparel model"
        cta={{ href: '/new-arrivals', label: 'New Arrivals' }}
        secondaryCta={{ href: '/sale', label: 'View Sale' }}
      />

      <section className="mx-auto max-w-[1400px] px-3 py-8 sm:px-6 sm:py-10">
        <ShopCatalog products={products} title="All Products" />
      </section>
    </main>
  );
}

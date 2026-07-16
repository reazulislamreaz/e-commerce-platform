import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/shared/page-hero';
import { CatalogToolbar, ProductGrid } from '@/components/shared/product-grid';
import { getAllProducts } from '@/features/products/data';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Shop premium Elevate Apparel — tees, hoodies, joggers, and essentials.',
};

const filters = [
  { label: 'All', href: '/shop' },
  { label: 'Men', href: '/category/men' },
  { label: 'Women', href: '/category/women' },
  { label: 'New', href: '/new-arrivals' },
  { label: 'Sale', href: '/sale' },
];

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
        <div className="mb-6 flex flex-wrap gap-2">
          {filters.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className={`border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                f.href === '/shop'
                  ? 'border-[#e5bd79] bg-[#e5bd79] text-[#18120b]'
                  : 'border-[#37332c] text-[#eee9e1] hover:border-[#e3bb78] hover:text-[#e3bb78]'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <CatalogToolbar title="All Products" count={products.length} />
        <ProductGrid products={products} />
      </section>
    </main>
  );
}

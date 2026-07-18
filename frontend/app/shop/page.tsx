import type { Metadata } from 'next';
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
      <section className="mx-auto max-w-[1400px] px-3 py-8 sm:px-6 sm:py-10">
        <ShopCatalog products={products} title="All Products" />
      </section>
    </main>
  );
}

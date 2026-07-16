'use client';

import Link from 'next/link';
import { ProductCard } from '@/components/shared/product-card';
import { getProductById } from '@/features/products/data';
import { useAppSelector } from '@/store/hooks';

export default function WishlistPage() {
  const ids = useAppSelector((s) => s.wishlist.productIds);
  const hydrated = useAppSelector((s) => s.wishlist.hydrated);
  const products = ids.map((id) => getProductById(id)).filter(Boolean);

  if (!hydrated) {
    return (
      <main className="flex flex-1 items-center justify-center bg-black py-20">
        <p className="text-sm text-[#b5b0a8]">Loading wishlist…</p>
      </main>
    );
  }

  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto max-w-[1400px] px-5 py-8 sm:px-7 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          Saved Items
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-white">WISHLIST</h1>
        {products.length === 0 ? (
          <div className="mt-10 text-center">
            <p className="text-sm text-[#b5b0a8]">No saved items yet.</p>
            <Link
              href="/shop"
              className="mt-6 inline-block border border-[#efc677] bg-[#e5bd79] px-6 py-3 text-[11px] font-bold uppercase text-[#18120b]"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-2.5 gap-y-6 min-[480px]:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product!.id} product={product!} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

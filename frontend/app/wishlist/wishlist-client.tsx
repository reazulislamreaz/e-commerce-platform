'use client';

import { WishlistGrid } from '@/components/shared/wishlist-grid';

export function WishlistPageClient() {
  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto max-w-[1400px] px-5 py-8 sm:px-7 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          Saved Items
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-white">WISHLIST</h1>
        <div className="mt-8">
          <WishlistGrid title="Saved" showClear emptyHint="No saved items yet." />
        </div>
      </section>
    </main>
  );
}

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShopCatalog } from '@/components/shop/shop-catalog';
import { getAllProducts, searchProducts } from '@/features/products/data';

function SearchResults() {
  const params = useSearchParams();
  const q = params.get('q')?.trim() ?? '';
  const products = q ? searchProducts(q, 100) : getAllProducts();

  return (
    <section className="mx-auto max-w-[1400px] px-3 py-8 sm:px-6 sm:py-10">
      <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">Search</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-white">
        {q ? `Results for “${q}”` : 'Search'}
      </h1>
      <div className="mt-8">
        <ShopCatalog
          products={products}
          title={q ? 'Matching Products' : 'All Products'}
          initialFilters={q ? { query: q } : undefined}
        />
      </div>
    </section>
  );
}

export default function SearchPage() {
  return (
    <main id="main-content" className="flex-1 bg-black">
      <Suspense
        fallback={
          <p className="px-5 py-20 text-center text-sm text-[#b5b0a8]">Searching…</p>
        }
      >
        <SearchResults />
      </Suspense>
    </main>
  );
}

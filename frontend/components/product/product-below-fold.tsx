'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import type { CatalogProduct } from '@/features/products/types';
import { normalizeProduct } from '@/features/products/types';
import { useProductsByIds, useRelatedProducts } from '@/features/products';
import { ProductWriteReview } from '@/components/product/product-write-review';
import { ProductCard } from '@/components/shared/product-card';
import { ProductGridSkeleton } from '@/components/common/skeleton';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { productViewed } from '@/store/slices/recently-viewed-slice';

const InlineSizeGuide = dynamic(
  () => import('@/components/product/inline-size-guide').then((mod) => mod.InlineSizeGuide),
  { ssr: false, loading: () => null },
);

const EasyReturnsExchange = dynamic(
  () => import('@/components/product/easy-returns-exchange').then((mod) => mod.EasyReturnsExchange),
  { ssr: false, loading: () => null },
);

function ProductRail({
  title,
  products,
  loading,
}: {
  title: string;
  products: CatalogProduct[];
  loading?: boolean;
}) {
  if (!loading && products.length === 0) return null;
  return (
    <section className="mx-auto max-w-[1400px] border-t border-[#E5E7EB] px-3 py-8 sm:px-6 sm:py-10">
      <h2 className="mb-5 text-base font-bold uppercase tracking-tight text-[#111111]">{title}</h2>
      {loading ? (
        <ProductGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-6 min-[480px]:grid-cols-3 lg:grid-cols-4">
          {products.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      )}
    </section>
  );
}

export function ProductBelowFold({ product }: { product: CatalogProduct }) {
  const p = normalizeProduct(product);
  const dispatch = useAppDispatch();
  const [deferred, setDeferred] = useState(false);
  const recentIds = useAppSelector((s) => s.recentlyViewed.productIds);
  const recentProductIds = useMemo(
    () => recentIds.filter((id) => id !== product.id).slice(0, 4),
    [recentIds, product.id],
  );

  useEffect(() => {
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setDeferred(true);
    };
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(enable, { timeout: 1200 });
    } else {
      timeoutId = setTimeout(enable, 200);
    }
    dispatch(productViewed(p.id));
    return () => {
      cancelled = true;
      if (idleId != null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [dispatch, p.id]);

  const related = useRelatedProducts(product.slug, deferred);
  const recentProducts = useProductsByIds(
    recentProductIds,
    deferred && recentProductIds.length > 0,
  );

  const recentlyViewed = recentProductIds.flatMap((id) => {
    const item = recentProducts.data?.find(
      (candidate) => candidate.id === id || candidate.legacyId === id,
    );
    return item ? [item] : [];
  });

  return (
    <>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7">
        <InlineSizeGuide category={p.category} />
        <EasyReturnsExchange />
      </div>

      <section className="mx-auto max-w-[1400px] border-t border-[#E5E7EB] px-5 py-8 sm:px-7">
        <h2 className="text-base font-bold uppercase tracking-tight text-[#111111]">
          Reviews & Ratings
        </h2>

        {p.reviews.length > 0 ? (
          <div className="mt-5 space-y-4">
            {p.reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-[4px] border border-[#E5E7EB] bg-white p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[#C9A227]">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="size-3 fill-[#C9A227]" strokeWidth={0} />
                    ))}
                  </span>
                  {review.verified && (
                    <span className="text-[10px] uppercase tracking-wide text-green-700">
                      Verified
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-[#555555]">{review.body}</p>
                <p className="mt-2 text-[11px] text-[#555555]">
                  {review.author} · {review.createdAt}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#555555]">
            No reviews yet. Be the first to share your thoughts.
          </p>
        )}

        <div className="mt-6">
          <ProductWriteReview productId={p.id} productName={p.name} />
        </div>
      </section>

      <ProductRail
        title="You May Also Like"
        products={related.data ?? []}
        loading={deferred && related.isLoading && !related.data}
      />
      <ProductRail
        title="Recently Viewed"
        products={recentlyViewed}
        loading={deferred && recentProductIds.length > 0 && recentProducts.isLoading}
      />
    </>
  );
}

'use client';

import Link from 'next/link';
import { ProductCard } from '@/components/shared/product-card';
import { useProductsByIds } from '@/features/products';
import { removeWishlistProduct } from '@/features/wishlist/api';
import { flashMessage } from '@/components/common/flash-message';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { wishlistCleared } from '@/store/slices/wishlist-slice';
import {
  selectAuthUser,
  selectWishlistCount,
  selectWishlistHydrated,
  selectWishlistIds,
} from '@/store/selectors';

export function WishlistGrid({
  title = 'Wishlist',
  showClear = false,
  emptyHint = 'Your wishlist is empty.',
}: {
  title?: string;
  showClear?: boolean;
  emptyHint?: string;
}) {
  const dispatch = useAppDispatch();
  const ids = useAppSelector(selectWishlistIds);
  const count = useAppSelector(selectWishlistCount);
  const hydrated = useAppSelector(selectWishlistHydrated);
  const user = useAppSelector(selectAuthUser);
  const resolved = useProductsByIds(ids, hydrated);
  const products = ids.flatMap((id) => {
    const product = resolved.data?.find((item) => item.id === id || item.legacyId === id);
    return product ? [{ ...product, id }] : [];
  });

  if (!hydrated || (ids.length > 0 && resolved.isLoading && !resolved.data)) {
    return (
      <div className="space-y-4">
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">{title}</h2>
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-6 min-[480px]:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: Math.min(ids.length || 4, 4) }, (_, i) => (
            <div key={i} className="min-w-0" aria-hidden>
              <div className="aspect-[.8] animate-pulse rounded-[4px] bg-[#1a1815]" />
              <div className="mt-2 h-3 w-[80%] animate-pulse rounded-[4px] bg-[#1a1815]" />
              <div className="mt-1.5 h-3 w-[40%] animate-pulse rounded-[4px] bg-[#1a1815]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">
          {title} ({count})
        </h2>
        {showClear && products.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const previous = [...ids];
              dispatch(wishlistCleared());
              if (!user) return;
              void Promise.all(previous.map((id) => removeWishlistProduct(id))).catch(() => {
                flashMessage('Could not clear wishlist on server. Local list cleared.');
              });
            }}
            className="text-[10px] font-semibold uppercase text-[#b5b0a8] hover:text-[#e3bb78]"
          >
            Clear All
          </button>
        )}
      </div>
      {products.length === 0 ? (
        <div className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5 text-sm text-[#b5b0a8]">
          {emptyHint}{' '}
          <Link href="/shop" className="text-[#e3bb78]">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-6 min-[480px]:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

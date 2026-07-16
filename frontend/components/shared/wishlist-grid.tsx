'use client';

import Link from 'next/link';
import { ProductCard } from '@/components/shared/product-card';
import { getProductById } from '@/features/products/data';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { wishlistCleared } from '@/store/slices/wishlist-slice';
import {
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
  const products = ids.map((id) => getProductById(id)).filter((p) => p != null);

  if (!hydrated) {
    return <p className="py-8 text-sm text-[#b5b0a8]">Loading wishlist…</p>;
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
            onClick={() => dispatch(wishlistCleared())}
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

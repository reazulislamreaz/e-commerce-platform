'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ProductCard } from '@/components/shared/product-card';
import { productCatalog, useProductsByIds, type CatalogProduct } from '@/features/products';
import { toReduxCartItems, upsertServerCartItem } from '@/features/cart/api';
import { removeWishlistProduct } from '@/features/wishlist/api';
import { toast } from '@/lib/toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { cartHydrated } from '@/store/slices/cart-slice';
import { wishlistCleared, wishlistRemoved } from '@/store/slices/wishlist-slice';
import {
  selectAuthUser,
  selectWishlistCount,
  selectWishlistHydrated,
  selectWishlistIds,
} from '@/store/selectors';

function MoveToCartControl({
  product,
  savedProductId,
}: {
  product: CatalogProduct;
  savedProductId: string;
}) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const [detail, setDetail] = useState<CatalogProduct>();
  const [variantId, setVariantId] = useState('');
  const [loading, setLoading] = useState(false);

  const availableVariants = (detail?.variants ?? []).filter((variant) => variant.stock > 0);

  function removeSavedItem() {
    dispatch(wishlistRemoved(savedProductId));
    if (user) {
      void removeWishlistProduct(savedProductId).catch(() => {
        toast.warning('Item moved, but wishlist sync will retry on your next session.', {
          dedupeKey: 'wishlist:sync',
        });
      });
    }
  }

  async function moveVariant(selectedVariantId: string) {
    setLoading(true);
    try {
      const cart = await upsertServerCartItem(selectedVariantId, 1);
      dispatch(cartHydrated(toReduxCartItems(cart)));
      removeSavedItem();
      toast.success(`${product.name} moved to your bag.`, {
        dedupeKey: `wishlist:move:${product.id}`,
      });
    } catch {
      toast.error('Could not move this item to your bag. Please try again.', {
        dedupeKey: 'wishlist:move-error',
      });
    } finally {
      setLoading(false);
    }
  }

  async function prepareMove() {
    if (detail) {
      if (!variantId) {
        toast.warning('Choose an available size and color.', { dedupeKey: 'wishlist:variant' });
        return;
      }
      await moveVariant(variantId);
      return;
    }

    setLoading(true);
    try {
      const resolved = await productCatalog.getBySlug(product.slug);
      const variants = (resolved?.variants ?? []).filter((variant) => variant.stock > 0);
      if (!resolved || variants.length === 0) {
        toast.warning('This item is currently out of stock.', { dedupeKey: 'wishlist:stock' });
        return;
      }
      if (variants.length === 1) {
        await moveVariant(variants[0].id);
        return;
      }
      setDetail(resolved);
      setVariantId(variants[0].id);
    } catch {
      toast.error('Could not load available options. Please try again.', {
        dedupeKey: 'wishlist:load-error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      {detail && availableVariants.length > 1 ? (
        <label className="block">
          <span className="sr-only">Choose size and color for {product.name}</span>
          <select
            value={variantId}
            onChange={(event) => setVariantId(event.target.value)}
            disabled={loading}
            className="w-full rounded-[4px] border border-[#E5E7EB] bg-white px-2.5 py-2 text-[11px] text-[#111111] outline-none focus:border-[#C9A227]"
          >
            {availableVariants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.size} / {variant.color} — {variant.stock} available
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        type="button"
        disabled={loading || product.inStock === false}
        onClick={() => void prepareMove()}
        className="w-full rounded-[4px] border border-[#111111] bg-[#111111] px-3 py-2 text-[10px] font-bold uppercase tracking-[.08em] text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Moving…' : detail ? 'Move selected to bag' : 'Move to bag'}
      </button>
    </div>
  );
}

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
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">{title}</h2>
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-6 min-[480px]:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: Math.min(ids.length || 4, 4) }, (_, i) => (
            <div key={i} className="min-w-0" aria-hidden>
              <div className="aspect-[.8] animate-pulse rounded-[4px] bg-white" />
              <div className="mt-2 h-3 w-[80%] animate-pulse rounded-[4px] bg-white" />
              <div className="mt-1.5 h-3 w-[40%] animate-pulse rounded-[4px] bg-white" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (ids.length > 0 && resolved.isError) {
    return (
      <div className="space-y-4">
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">
          {title} ({count})
        </h2>
        <div
          className="rounded-[4px] border border-[#E5E7EB] bg-white p-5 text-sm text-[#555555]"
          role="alert"
        >
          <p>We couldn&apos;t load your saved items. Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => void resolved.refetch()}
            className="mt-4 rounded-[4px] border border-[#111111] bg-[#111111] px-4 py-2 text-[10px] font-bold uppercase tracking-[.08em] text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">
          {title} ({count})
        </h2>
        {showClear && products.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const previous = [...ids];
              dispatch(wishlistCleared());
              toast.info('Wishlist cleared.', { dedupeKey: 'wishlist:clear' });
              if (!user) return;
              void Promise.all(previous.map((id) => removeWishlistProduct(id))).catch(() => {
                toast.warning('Could not clear wishlist on server. Local list cleared.', {
                  dedupeKey: 'wishlist:clear-sync',
                });
              });
            }}
            className="text-[10px] font-semibold uppercase text-[#555555] hover:text-[#C9A227]"
          >
            Clear All
          </button>
        )}
      </div>
      {products.length === 0 ? (
        <div className="rounded-[4px] border border-[#E5E7EB] bg-white p-5 text-sm text-[#555555]">
          {emptyHint}{' '}
          <Link href="/shop" className="text-[#C9A227]">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-6 min-[480px]:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <div key={product.id} className="min-w-0">
              <ProductCard product={product} />
              <MoveToCartControl product={product} savedProductId={product.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

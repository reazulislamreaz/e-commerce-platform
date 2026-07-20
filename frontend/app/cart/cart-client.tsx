'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { flashMessage } from '@/components/common/flash-message';
import { formatTaka } from '@/lib/currency';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { itemQuantitySet, itemRemoved } from '@/store/slices/cart-slice';
import { selectCartHydrated, selectCartItems } from '@/store/selectors';
import {
  cartSubtotal,
  resolveCartLines,
  shippingForSubtotal,
} from '@/features/cart/pricing';
import { useProductsByIds } from '@/features/products';
import { trackAddToCart } from '@/features/analytics/facebook-pixel';

function syncQtyFailed() {
  flashMessage('Could not sync bag. Changes saved on this device.');
}

export function CartClient() {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems);
  const hydrated = useAppSelector(selectCartHydrated);
  const products = useProductsByIds(
    items.map(({ productId }) => productId),
    hydrated,
  );

  if (!hydrated || (items.length > 0 && products.isLoading && !products.data)) {
    return (
      <main id="main-content" className="flex-1 bg-black" aria-busy="true">
        <section className="mx-auto max-w-[1400px] px-5 py-8 sm:px-7 sm:py-10">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
            Shopping Bag
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-white">YOUR BAG</h1>
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <ul className="space-y-4">
              {Array.from({ length: Math.min(items.length || 2, 3) }, (_, i) => (
                <li
                  key={i}
                  className="flex gap-4 rounded-[4px] border border-[#2d2a27] bg-[#111110] p-3 sm:p-4"
                >
                  <div className="h-28 w-24 shrink-0 animate-pulse rounded-[4px] bg-[#1a1815]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-[66%] animate-pulse rounded-[4px] bg-[#1a1815]" />
                    <div className="h-3 w-[33%] animate-pulse rounded-[4px] bg-[#1a1815]" />
                    <div className="h-4 w-[25%] animate-pulse rounded-[4px] bg-[#1a1815]" />
                  </div>
                </li>
              ))}
            </ul>
            <aside className="h-40 animate-pulse rounded-[4px] border border-[#2d2a27] bg-[#111110]" />
          </div>
        </section>
      </main>
    );
  }

  if (items.length > 0 && products.isError) {
    return (
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center bg-black px-5 py-20 text-center"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          Shopping Bag
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-white">
          COULD NOT LOAD BAG
        </h1>
        <p className="mt-3 max-w-sm text-sm text-[#b5b0a8]" role="alert">
          We couldn&apos;t load product details for items in your bag. Check your connection and try
          again.
        </p>
        <button
          type="button"
          onClick={() => void products.refetch()}
          className="mt-8 border border-[#efc677] bg-[#e5bd79] px-6 py-3 text-[11px] font-bold uppercase text-[#18120b] hover:bg-[#eec98a]"
        >
          Try Again
        </button>
      </main>
    );
  }

  const lines = resolveCartLines(items, products.data ?? []);
  const subtotal = cartSubtotal(lines);
  const shipping = shippingForSubtotal(subtotal);
  const total = subtotal + shipping;

  if (lines.length === 0) {
    return (
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center bg-black px-5 py-20 text-center"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          Shopping Bag
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-white">
          YOUR BAG IS EMPTY
        </h1>
        <p className="mt-3 max-w-sm text-sm text-[#b5b0a8]">
          Discover premium essentials and start elevating your everyday.
        </p>
        <Link
          href="/shop"
          className="mt-8 border border-[#efc677] bg-[#e5bd79] px-6 py-3 text-[11px] font-bold uppercase text-[#18120b] hover:bg-[#eec98a]"
        >
          Continue Shopping
        </Link>
      </main>
    );
  }

  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto max-w-[1400px] px-5 py-8 sm:px-7 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          Shopping Bag
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-white">YOUR BAG</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <ul className="space-y-4">
            {lines.map(({ item, product }) => (
              <li
                key={`${item.productId}-${item.variantId}`}
                className="flex gap-4 rounded-[4px] border border-[#2d2a27] bg-[#111110] p-3 sm:p-4"
              >
                <Link
                  href={`/product/${product.slug}`}
                  className="relative h-28 w-24 shrink-0 overflow-hidden rounded-[4px] bg-[#e4e3e1]"
                >
                  <Image src={product.image} alt={product.name} fill className="object-cover" sizes="96px" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/product/${product.slug}`}
                        className="text-sm font-semibold text-white hover:text-[#e3bb78]"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1 text-[12px] text-[#b5b0a8]">
                        {item.color} · Size {item.size}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#e5c17d]">
                        {formatTaka(product.price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove item"
                      onClick={() => {
                        dispatch(
                          itemRemoved({ productId: item.productId, variantId: item.variantId }),
                        );
                        void import('@/features/cart/api').then(({ removeServerCartItem }) =>
                          removeServerCartItem(item.variantId).catch(syncQtyFailed),
                        );
                      }}
                      className="p-1 text-[#8b867d] hover:text-red-400"
                    >
                      <Trash2 className="size-4" strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="mt-3 inline-flex items-center rounded-[4px] border border-[#37332c]">
                    <button
                      type="button"
                      aria-label="Decrease"
                      onClick={() => {
                        const quantity = item.quantity - 1;
                        dispatch(
                          itemQuantitySet({
                            productId: item.productId,
                            variantId: item.variantId,
                            quantity,
                          }),
                        );
                        void import('@/features/cart/api').then(({ setServerCartItemQuantity }) =>
                          setServerCartItemQuantity(item.variantId, quantity).catch(syncQtyFailed),
                        );
                      }}
                      className="p-2 text-white hover:text-[#e3bb78]"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="min-w-8 text-center text-sm text-white">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase"
                      onClick={() => {
                        const quantity = item.quantity + 1;
                        dispatch(
                          itemQuantitySet({
                            productId: item.productId,
                            variantId: item.variantId,
                            quantity,
                          }),
                        );
                        trackAddToCart({
                          content_ids: [item.productId],
                          content_name: product.name,
                          value: product.price,
                        });
                        void import('@/features/cart/api').then(({ setServerCartItemQuantity }) =>
                          setServerCartItemQuantity(item.variantId, quantity).catch(syncQtyFailed),
                        );
                      }}
                      className="p-2 text-white hover:text-[#e3bb78]"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5">
            <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">
              Order Summary
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-[#b5b0a8]">
                <dt>Subtotal</dt>
                <dd className="text-white">{formatTaka(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-[#b5b0a8]">
                <dt>Shipping</dt>
                <dd className="text-white">{shipping === 0 ? 'Free' : formatTaka(shipping)}</dd>
              </div>
              <div className="flex justify-between border-t border-[#2d2a27] pt-3 text-base font-semibold text-white">
                <dt>Total</dt>
                <dd className="text-[#e5c17d]">{formatTaka(total)}</dd>
              </div>
            </dl>
            <Link
              href="/checkout"
              className="mt-5 block rounded-[4px] border border-[#efc677] bg-[#e5bd79] py-3 text-center text-[11px] font-bold uppercase text-[#18120b] hover:bg-[#eec98a]"
            >
              Checkout
            </Link>
            <Link
              href="/shop"
              className="mt-3 block text-center text-[11px] font-semibold uppercase tracking-wide text-[#b5b0a8] hover:text-[#e3bb78]"
            >
              Continue Shopping
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

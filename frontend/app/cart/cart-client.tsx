'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatTaka } from '@/lib/currency';
import { useCartDetails, useCartMutations } from '@/features/cart/hooks';
import { trackAddToCart } from '@/features/analytics/facebook-pixel';

export function CartClient() {
  const { items, hydrated, lines, subtotal, shipping, total, productsQuery } = useCartDetails();
  const { setItemQuantity, removeItem } = useCartMutations();

  if (!hydrated || (items.length > 0 && productsQuery.isLoading && !productsQuery.data)) {
    return (
      <main id="main-content" className="flex-1 bg-[#FAFAFA]" aria-busy="true">
        <section className="mx-auto max-w-[1400px] px-5 py-8 sm:px-7 sm:py-10">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
            Shopping Bag
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-[#111111]">
            YOUR BAG
          </h1>
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <ul className="space-y-4">
              {Array.from({ length: Math.min(items.length || 2, 3) }, (_, i) => (
                <li
                  key={i}
                  className="flex gap-4 rounded-[4px] border border-[#E5E7EB] bg-white p-3 sm:p-4"
                >
                  <div className="h-28 w-24 shrink-0 animate-pulse rounded-[4px] bg-white" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-[66%] animate-pulse rounded-[4px] bg-white" />
                    <div className="h-3 w-[33%] animate-pulse rounded-[4px] bg-white" />
                    <div className="h-4 w-[25%] animate-pulse rounded-[4px] bg-white" />
                  </div>
                </li>
              ))}
            </ul>
            <aside className="h-40 animate-pulse rounded-[4px] border border-[#E5E7EB] bg-white" />
          </div>
        </section>
      </main>
    );
  }

  if (items.length > 0 && productsQuery.isError) {
    return (
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center bg-[#FAFAFA] px-5 py-20 text-center"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
          Shopping Bag
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-[#111111]">
          COULD NOT LOAD BAG
        </h1>
        <p className="mt-3 max-w-sm text-sm text-[#555555]" role="alert">
          We couldn&apos;t load product details for items in your bag. Check your connection and try
          again.
        </p>
        <button
          type="button"
          onClick={() => void productsQuery.refetch()}
          className="mt-8 border border-[#111111] bg-[#111111] px-6 py-3 text-[11px] font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
        >
          Try Again
        </button>
      </main>
    );
  }

  if (lines.length === 0) {
    return (
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center bg-[#FAFAFA] px-5 py-20 text-center"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
          Shopping Bag
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-[#111111]">
          YOUR BAG IS EMPTY
        </h1>
        <p className="mt-3 max-w-sm text-sm text-[#555555]">
          Discover premium essentials and start elevating your everyday.
        </p>
        <Link
          href="/shop"
          className="mt-8 border border-[#111111] bg-[#111111] px-6 py-3 text-[11px] font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
        >
          Continue Shopping
        </Link>
      </main>
    );
  }

  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]">
      <section className="mx-auto max-w-[1400px] px-5 py-8 sm:px-7 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
          Shopping Bag
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-[#111111]">YOUR BAG</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <ul className="space-y-4">
            {lines.map(({ item, product }) => (
              <li
                key={`${item.productId}-${item.variantId}`}
                className="flex gap-4 rounded-[4px] border border-[#E5E7EB] bg-white p-3 sm:p-4"
              >
                <Link
                  href={`/product/${product.slug}`}
                  className="relative h-28 w-24 shrink-0 overflow-hidden rounded-[4px] bg-[#e4e3e1]"
                >
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/product/${product.slug}`}
                        className="text-sm font-semibold text-[#111111] hover:text-[#C9A227]"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1 text-[12px] text-[#555555]">
                        {item.color} · Size {item.size}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#C9A227]">
                        {formatTaka(product.price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove item"
                      onClick={() =>
                        removeItem({
                          productId: item.productId,
                          variantId: item.variantId,
                          name: product.name,
                        })
                      }
                      className="p-1 text-[#555555] hover:text-red-600"
                    >
                      <Trash2 className="size-4" strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="mt-3 inline-flex items-center rounded-[4px] border border-[#E5E7EB]">
                    <button
                      type="button"
                      aria-label="Decrease"
                      onClick={() =>
                        setItemQuantity({
                          productId: item.productId,
                          variantId: item.variantId,
                          quantity: item.quantity - 1,
                        })
                      }
                      className="p-2 text-[#111111] hover:text-[#C9A227]"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="min-w-8 text-center text-sm text-[#111111]">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase"
                      onClick={() => {
                        setItemQuantity({
                          productId: item.productId,
                          variantId: item.variantId,
                          quantity: item.quantity + 1,
                        });
                        trackAddToCart({
                          content_ids: [item.productId],
                          content_name: product.name,
                          value: product.price,
                        });
                      }}
                      className="p-2 text-[#111111] hover:text-[#C9A227]"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-[4px] border border-[#E5E7EB] bg-white p-5">
            <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">
              Order Summary
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-[#555555]">
                <dt>Subtotal</dt>
                <dd className="text-[#111111]">{formatTaka(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-[#555555]">
                <dt>Shipping</dt>
                <dd className="text-[#111111]">{shipping === 0 ? 'Free' : formatTaka(shipping)}</dd>
              </div>
              <div className="flex justify-between border-t border-[#E5E7EB] pt-3 text-base font-semibold text-[#111111]">
                <dt>Total</dt>
                <dd className="text-[#C9A227]">{formatTaka(total)}</dd>
              </div>
            </dl>
            <Link
              href="/checkout"
              className="mt-5 block rounded-[4px] border border-[#111111] bg-[#111111] py-3 text-center text-[11px] font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
            >
              Checkout
            </Link>
            <Link
              href="/shop"
              className="mt-3 block text-center text-[11px] font-semibold uppercase tracking-wide text-[#555555] hover:text-[#C9A227]"
            >
              Continue Shopping
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

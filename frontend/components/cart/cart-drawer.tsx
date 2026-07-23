'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { formatTaka } from '@/lib/currency';
import { useCartDetails, useCartMutations } from '@/features/cart/hooks';
import { trackAddToCart } from '@/features/analytics/facebook-pixel';
import { cn } from '@/lib/utils';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

function trapFocus(event: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return;
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Right slide-out mini cart. Reuses the shared cart hooks so quantity/remove
 * mutations stay consistent with the cart page. Handles ESC, click-outside,
 * background scroll lock, and focus management for accessibility.
 */
export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const { lines, subtotal, shipping, total, totalItems, productsQuery } = useCartDetails();
  const { setItemQuantity, removeItem } = useCartMutations();

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === 'Tab') trapFocus(event, panelRef.current);
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }, 60);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      restoreFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  const isLoading = totalItems > 0 && lines.length === 0 && productsQuery.isLoading;
  const isEmpty = lines.length === 0 && !isLoading;

  return (
    <div aria-hidden={!open} className={cn('fixed inset-0 z-[70]', !open && 'pointer-events-none')}>
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close shopping bag"
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-[#111111]/40 backdrop-blur-[1px] transition-opacity duration-300 ease-out motion-reduce:transition-none',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        className={cn(
          'absolute right-0 top-0 flex h-full w-[86vw] max-w-[400px] flex-col bg-[#FAFAFA] shadow-[0_0_40px_rgba(0,0,0,.25)] transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] will-change-transform motion-reduce:transition-none',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between border-b border-[#E5E7EB] bg-white px-5 py-4">
          <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[.14em] text-[#111111]">
            <ShoppingBag className="size-4 text-[#C9A227]" strokeWidth={1.8} aria-hidden="true" />
            Your Bag
            {totalItems > 0 && <span className="text-[#555555]">({totalItems})</span>}
          </h2>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label="Close shopping bag"
            className="rounded-[4px] p-1.5 text-[#111111] transition-colors hover:text-[#C9A227] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]"
          >
            <X className="size-5" strokeWidth={1.7} />
          </button>
        </header>

        {isLoading ? (
          <ul className="flex-1 space-y-3 overflow-hidden px-4 py-4" aria-busy="true">
            {Array.from({ length: Math.min(totalItems, 4) }, (_, index) => (
              <li
                key={index}
                className="flex gap-3 rounded-[4px] border border-[#E5E7EB] bg-white p-3"
              >
                <div className="h-24 w-20 shrink-0 animate-pulse rounded-[4px] bg-[#F4F4F5]" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 w-[70%] animate-pulse rounded-[4px] bg-[#F4F4F5]" />
                  <div className="h-3 w-[40%] animate-pulse rounded-[4px] bg-[#F4F4F5]" />
                  <div className="mt-6 h-4 w-[30%] animate-pulse rounded-[4px] bg-[#F4F4F5]" />
                </div>
              </li>
            ))}
          </ul>
        ) : isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag className="size-10 text-[#E5E7EB]" strokeWidth={1.4} aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-[#111111]">Your bag is empty</p>
              <p className="mt-1 text-[12px] text-[#555555]">
                Discover premium essentials and start elevating your everyday.
              </p>
            </div>
            <Link
              href="/shop"
              onClick={onClose}
              className="mt-1 rounded-[4px] border border-[#111111] bg-[#111111] px-6 py-3 text-[11px] font-bold uppercase tracking-[.08em] text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
              {lines.map(({ item, product }) => (
                <li
                  key={`${item.productId}-${item.variantId}`}
                  className="flex gap-3 rounded-[4px] border border-[#E5E7EB] bg-white p-3"
                >
                  <Link
                    href={`/product/${product.slug}`}
                    onClick={onClose}
                    className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[4px] bg-[#e4e3e1]"
                  >
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/product/${product.slug}`}
                        onClick={onClose}
                        className="line-clamp-2 text-[13px] font-semibold text-[#111111] hover:text-[#C9A227]"
                      >
                        {product.name}
                      </Link>
                      <button
                        type="button"
                        aria-label={`Remove ${product.name} from bag`}
                        onClick={() =>
                          removeItem({
                            productId: item.productId,
                            variantId: item.variantId,
                            name: product.name,
                          })
                        }
                        className="shrink-0 rounded-[4px] p-1 text-[#555555] transition-colors hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]"
                      >
                        <Trash2 className="size-4" strokeWidth={1.5} />
                      </button>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#555555]">
                      {item.color} · Size {item.size}
                    </p>
                    <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                      <div className="inline-flex items-center rounded-[4px] border border-[#E5E7EB]">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${product.name}`}
                          onClick={() =>
                            setItemQuantity({
                              productId: item.productId,
                              variantId: item.variantId,
                              quantity: item.quantity - 1,
                            })
                          }
                          className="p-1.5 text-[#111111] transition-colors hover:text-[#C9A227] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="min-w-7 text-center text-[13px] font-semibold text-[#111111] tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${product.name}`}
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
                          className="p-1.5 text-[#111111] transition-colors hover:text-[#C9A227] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-semibold text-[#C9A227] tabular-nums">
                          {formatTaka(product.price * item.quantity)}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-[10px] text-[#555555] tabular-nums">
                            {formatTaka(product.price)} each
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-[#E5E7EB] bg-white px-5 py-4">
              <dl className="space-y-2 text-[13px]">
                <div className="flex justify-between text-[#555555]">
                  <dt>Total items</dt>
                  <dd className="font-semibold text-[#111111] tabular-nums">{totalItems}</dd>
                </div>
                <div className="flex justify-between text-[#555555]">
                  <dt>Subtotal</dt>
                  <dd className="text-[#111111] tabular-nums">{formatTaka(subtotal)}</dd>
                </div>
                <div className="flex justify-between text-[#555555]">
                  <dt>Delivery charge</dt>
                  <dd className="text-[#111111] tabular-nums">
                    {shipping === 0 ? 'Free' : formatTaka(shipping)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-[#E5E7EB] pt-2 text-[15px] font-semibold text-[#111111]">
                  <dt>Estimated total</dt>
                  <dd className="text-[#C9A227] tabular-nums">{formatTaka(total)}</dd>
                </div>
              </dl>

              <Link
                href="/checkout"
                onClick={onClose}
                className="mt-4 block rounded-[4px] border border-[#111111] bg-[#111111] py-3 text-center text-[11px] font-bold uppercase tracking-[.08em] text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]"
              >
                Proceed to Checkout
              </Link>
              <div className="mt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[11px] font-semibold uppercase tracking-wide text-[#555555] transition-colors hover:text-[#C9A227]"
                >
                  Continue Shopping
                </button>
                <Link
                  href="/cart"
                  onClick={onClose}
                  className="text-[11px] font-semibold uppercase tracking-wide text-[#111111] transition-colors hover:text-[#C9A227]"
                >
                  View Cart
                </Link>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

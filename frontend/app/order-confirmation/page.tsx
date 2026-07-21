'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatTaka } from '@/lib/currency';
import type { CustomerOrder } from '@/features/account';
import { trackPurchase } from '@/features/analytics/facebook-pixel';

function readLastOrder(): CustomerOrder | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('elevate:lastOrder');
    return raw ? (JSON.parse(raw) as CustomerOrder) : null;
  } catch {
    return null;
  }
}

function OrderConfirmationInner() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order')?.trim() || null;
  const email = searchParams.get('email')?.trim() || null;
  const [cachedOrder] = useState(readLastOrder);
  const tracked = useRef(false);

  const order = useMemo(() => {
    if (cachedOrder && (!orderNumber || cachedOrder.number === orderNumber)) {
      return cachedOrder;
    }
    return null;
  }, [cachedOrder, orderNumber]);

  const displayNumber = order?.number ?? orderNumber;

  useEffect(() => {
    if (!order || tracked.current) return;
    tracked.current = true;
    trackPurchase({
      content_ids: order.items.map((item) => item.productId),
      value: order.total,
      order_id: order.number,
    });
  }, [order]);

  const trackHref =
    displayNumber && email
      ? `/track-order?order=${encodeURIComponent(displayNumber)}&email=${encodeURIComponent(email)}`
      : displayNumber
        ? `/track-order?order=${encodeURIComponent(displayNumber)}`
        : '/track-order';

  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]">
      <section className="mx-auto max-w-xl px-5 py-16 text-center sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
          Checkout
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#111111]">ORDER CONFIRMED</h1>
        {displayNumber ? (
          <div className="mt-6 rounded-[4px] border border-[#E5E7EB] bg-white p-5 text-left">
            <p className="text-sm text-[#555555]">Order number</p>
            <p className="text-lg font-bold text-[#111111]">#{displayNumber}</p>
            {order ? (
              <>
                <p className="mt-3 text-sm text-[#555555]">
                  Total paid:{' '}
                  <span className="font-semibold text-[#C9A227]">{formatTaka(order.total)}</span>
                </p>
                {order.trackingNumber && (
                  <p className="mt-1 text-sm text-[#555555]">Tracking: {order.trackingNumber}</p>
                )}
              </>
            ) : null}
            <p className="mt-4 text-sm text-[#555555]">
              A confirmation will be sent to your email. Create an account next time to save order
              history.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#555555]">
            Thank you for your purchase. Use Track Order with your email if you need your order
            number.
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/shop"
            className="rounded-[4px] border border-[#111111] bg-[#111111] px-5 py-3 text-[11px] font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
          >
            Continue Shopping
          </Link>
          <Link
            href={trackHref}
            className="rounded-[4px] border border-[#111111] bg-white px-5 py-3 text-[11px] font-bold uppercase text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
          >
            Track Order
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#555555]">Loading…</p>
        </main>
      }
    >
      <OrderConfirmationInner />
    </Suspense>
  );
}

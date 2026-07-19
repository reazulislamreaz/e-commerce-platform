'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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

export default function OrderConfirmationPage() {
  const [order] = useState(readLastOrder);
  const tracked = useRef(false);

  useEffect(() => {
    if (!order || tracked.current) return;
    tracked.current = true;
    trackPurchase({
      content_ids: order.items.map((item) => item.productId),
      value: order.total,
      order_id: order.number,
    });
  }, [order]);

  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto max-w-xl px-5 py-16 text-center sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          Checkout
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">ORDER CONFIRMED</h1>
        {order ? (
          <div className="mt-6 rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5 text-left">
            <p className="text-sm text-[#b5b0a8]">Order number</p>
            <p className="text-lg font-bold text-white">#{order.number}</p>
            <p className="mt-3 text-sm text-[#b5b0a8]">
              Total paid:{' '}
              <span className="font-semibold text-[#e5c17d]">{formatTaka(order.total)}</span>
            </p>
            {order.trackingNumber && (
              <p className="mt-1 text-sm text-[#b5b0a8]">Tracking: {order.trackingNumber}</p>
            )}
            <p className="mt-4 text-sm text-[#b5b0a8]">
              A confirmation will be sent to your email. Create an account next time to save order
              history.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#b5b0a8]">Thank you for your purchase.</p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/shop"
            className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-5 py-3 text-[11px] font-bold uppercase text-[#18120b]"
          >
            Continue Shopping
          </Link>
          <Link
            href="/track-order"
            className="rounded-[4px] border border-[#37332c] px-5 py-3 text-[11px] font-bold uppercase text-white"
          >
            Track Order
          </Link>
        </div>
      </section>
    </main>
  );
}

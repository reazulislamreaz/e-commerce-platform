'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';
import { accountRepository, type CustomerOrder } from '@/features/account';
import { formatTaka } from '@/lib/currency';

function OrderDetailInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const confirmed = searchParams.get('confirmed') === '1';
  const user = useAppSelector(selectAuthUser)!;
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void accountRepository
      .getOrder?.(id)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id, user.id]);

  if (loading) {
    return <p className="text-sm text-[#b5b0a8]">Loading order…</p>;
  }

  if (!order) {
    return (
      <div className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5 text-sm text-[#b5b0a8]">
        Order not found.{' '}
        <Link href="/account/orders" className="text-[#e3bb78]">
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {confirmed && (
        <div className="rounded-[4px] border border-[#2d4a2d] bg-[#102010] p-4 text-sm text-[#8fbf8f]">
          Order placed successfully. Thank you for shopping with Elevate Apparel.
        </div>
      )}

      <div className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Order #{order.number}</h2>
            <p className="mt-1 text-sm capitalize text-[#b5b0a8]">
              Status: {order.status} · {new Date(order.createdAt).toLocaleString()}
            </p>
            {order.trackingNumber && (
              <p className="mt-1 text-sm text-[#e3bb78]">Tracking: {order.trackingNumber}</p>
            )}
          </div>
          <Link
            href={`/track-order?number=${encodeURIComponent(order.number)}&email=${encodeURIComponent(user.email)}`}
            className="rounded-[4px] border border-[#37332c] px-3 py-2 text-[10px] font-bold uppercase text-white hover:border-[#e3bb78]"
          >
            Track Order
          </Link>
        </div>

        <ol className="mt-6 grid gap-2 sm:grid-cols-5">
          {order.timeline.map((step) => (
            <li
              key={step.label}
              className={`rounded-[4px] border px-3 py-2 text-[11px] ${
                step.done
                  ? 'border-[#e5bd79]/40 bg-[#1a1815] text-[#e3bb78]'
                  : 'border-[#2d2a27] text-[#8b867d]'
              }`}
            >
              {step.label}
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5">
        <h3 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">Items</h3>
        <ul className="mt-4 space-y-3">
          {order.items.map((item) => (
            <li key={`${item.productId}-${item.size}-${item.color}`} className="flex gap-3">
              <div className="relative h-16 w-14 overflow-hidden rounded-[4px] bg-[#e4e3e1]">
                <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <Link
                  href={`/product/${item.slug}`}
                  className="font-medium text-white hover:text-[#e3bb78]"
                >
                  {item.name}
                </Link>
                <p className="text-[12px] text-[#8b867d]">
                  {item.color} / {item.size} × {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold text-[#e5c17d]">
                {formatTaka(item.unitPrice * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
        <dl className="mt-5 space-y-1 border-t border-[#2d2a27] pt-4 text-sm">
          <div className="flex justify-between text-[#b5b0a8]">
            <dt>Subtotal</dt>
            <dd>{formatTaka(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-[#b5b0a8]">
              <dt>Discount</dt>
              <dd className="text-[#8fbf8f]">−{formatTaka(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between text-[#b5b0a8]">
            <dt>Shipping</dt>
            <dd>{order.shipping === 0 ? 'Free' : formatTaka(order.shipping)}</dd>
          </div>
          <div className="flex justify-between pt-2 font-semibold text-white">
            <dt>Total</dt>
            <dd className="text-[#e5c17d]">{formatTaka(order.total)}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5 text-sm text-[#e9e5de]">
        <h3 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">Shipping To</h3>
        <p className="mt-2">{order.shippingAddress.fullName}</p>
        <p className="text-[#b5b0a8]">
          {order.shippingAddress.line1}
          {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
        </p>
        <p className="text-[#b5b0a8]">
          {order.shippingAddress.city}, {order.shippingAddress.district}{' '}
          {order.shippingAddress.postalCode}
        </p>
        <p className="mt-2 capitalize text-[#b5b0a8]">Payment: {order.paymentMethod}</p>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#b5b0a8]">Loading order…</p>}>
      <OrderDetailInner />
    </Suspense>
  );
}

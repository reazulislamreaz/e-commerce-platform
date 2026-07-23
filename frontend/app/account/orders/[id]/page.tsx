'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { ReviewForm } from '@/components/account/review-form';
import { toast } from '@/lib/toast';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';
import { useAccountOrder, useAccountReviews, useDownloadInvoice } from '@/features/account';
import { formatTaka } from '@/lib/currency';
import { AccountPanelSkeleton } from '@/components/common/skeleton';

function OrderDetailInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const confirmed = searchParams.get('confirmed') === '1';
  const user = useAppSelector(selectAuthUser)!;
  const { data: reviews } = useAccountReviews(user.id);
  const orderQuery = useAccountOrder(user.id, id);
  const order = orderQuery.data;
  const downloadInvoice = useDownloadInvoice();
  const [reviewProductId, setReviewProductId] = useState<string | null>(null);
  const confirmedToastShown = useRef(false);

  useEffect(() => {
    if (!confirmed || confirmedToastShown.current) return;
    confirmedToastShown.current = true;
    toast.success('Order placed successfully. Thank you for shopping with Elevate Apparel.', {
      dedupeKey: 'order:confirmed',
    });
  }, [confirmed]);

  if (orderQuery.isLoading) {
    return <AccountPanelSkeleton />;
  }

  if (orderQuery.isError || !order) {
    return (
      <div className="rounded-[4px] border border-[#E5E7EB] bg-white p-5 text-sm text-[#555555]">
        Order not found.{' '}
        <Link href="/account/orders" className="text-[#C9A227]">
          Back to orders
        </Link>
      </div>
    );
  }

  const uniqueProducts = Array.from(
    new Map(order.items.map((item) => [item.productId, item])).values(),
  );

  return (
    <div className="space-y-4">
      {confirmed && (
        <div className="rounded-[4px] border border-green-200 bg-[#f0fdf4] p-4 text-sm text-green-700">
          Order placed successfully. Thank you for shopping with Elevate Apparel.
        </div>
      )}

      <div className="rounded-[4px] border border-[#E5E7EB] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#111111]">Order #{order.number}</h2>
            <p className="mt-1 text-sm capitalize text-[#555555]">
              Status: {order.status} · {new Date(order.createdAt).toLocaleString()}
            </p>
            {order.trackingNumber && (
              <p className="mt-1 text-sm text-[#C9A227]">Tracking: {order.trackingNumber}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                downloadInvoice.mutate({ orderNumber: order.number, orderId: order.id })
              }
              disabled={downloadInvoice.isPending}
              className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#111111] bg-[#111111] px-3 py-2 text-[10px] font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="size-3.5" strokeWidth={1.8} />
              {downloadInvoice.isPending ? 'Preparing…' : 'Invoice'}
            </button>
            <Link
              href={`/track-order?number=${encodeURIComponent(order.number)}&email=${encodeURIComponent(user.email)}`}
              className="rounded-[4px] border border-[#E5E7EB] px-3 py-2 text-[10px] font-bold uppercase text-[#111111] hover:border-[#C9A227]"
            >
              Track Order
            </Link>
          </div>
        </div>

        <ol className="mt-6 grid gap-2 sm:grid-cols-5">
          {order.timeline.map((step) => (
            <li
              key={step.label}
              className={`rounded-[4px] border px-3 py-2 text-[11px] ${
                step.done
                  ? 'border-[#C9A227]/40 bg-white text-[#C9A227]'
                  : 'border-[#E5E7EB] text-[#555555]'
              }`}
            >
              {step.label}
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-[4px] border border-[#E5E7EB] bg-white p-5">
        <h3 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">Items</h3>
        <ul className="mt-4 space-y-3">
          {order.items.map((item) => (
            <li key={`${item.productId}-${item.size}-${item.color}`} className="flex gap-3">
              <div className="relative h-16 w-14 overflow-hidden rounded-[4px] bg-[#e4e3e1]">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <Link
                  href={`/product/${item.slug}`}
                  className="font-medium text-[#111111] hover:text-[#C9A227]"
                >
                  {item.name}
                </Link>
                <p className="text-[12px] text-[#555555]">
                  {item.color} / {item.size} × {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold text-[#C9A227]">
                {formatTaka(item.unitPrice * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
        <dl className="mt-5 space-y-1 border-t border-[#E5E7EB] pt-4 text-sm">
          <div className="flex justify-between text-[#555555]">
            <dt>Subtotal</dt>
            <dd>{formatTaka(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-[#555555]">
              <dt>Discount</dt>
              <dd className="text-green-700">−{formatTaka(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between text-[#555555]">
            <dt>Shipping</dt>
            <dd>{order.shipping === 0 ? 'Free' : formatTaka(order.shipping)}</dd>
          </div>
          <div className="flex justify-between pt-2 font-semibold text-[#111111]">
            <dt>Total</dt>
            <dd className="text-[#C9A227]">{formatTaka(order.total)}</dd>
          </div>
        </dl>
      </div>

      {order.status === 'delivered' ? (
        <div className="rounded-[4px] border border-[#E5E7EB] bg-white p-5">
          <h3 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">
            Review your purchase
          </h3>
          <p className="mt-1 text-sm text-[#555555]">
            Share feedback for each product in this delivered order.
          </p>
          <ul className="mt-4 space-y-3">
            {uniqueProducts.map((item) => {
              const existingReview = reviews.find((review) => review.productId === item.productId);
              return (
                <li key={item.productId} className="rounded-[4px] border border-[#E5E7EB] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-[#111111]">{item.name}</p>
                    {existingReview ? (
                      <Link
                        href="/account/reviews"
                        className="text-[10px] font-bold uppercase tracking-[.08em] text-[#C9A227] hover:text-[#D4B03A]"
                      >
                        View your review
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setReviewProductId((current) =>
                            current === item.productId ? null : item.productId,
                          )
                        }
                        className="rounded-[4px] border border-[#111111] bg-[#111111] px-3 py-2 text-[10px] font-bold uppercase tracking-[.08em] text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
                      >
                        Write review
                      </button>
                    )}
                  </div>
                  {reviewProductId === item.productId && !existingReview ? (
                    <div className="mt-3">
                      <ReviewForm
                        userId={user.id}
                        productId={item.productId}
                        productName={item.name}
                        onSaved={() => setReviewProductId(null)}
                        onCancel={() => setReviewProductId(null)}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="rounded-[4px] border border-[#E5E7EB] bg-white p-5 text-sm text-[#555555]">
        <h3 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">
          Shipping To
        </h3>
        <p className="mt-2">{order.shippingAddress.fullName}</p>
        <p className="text-[#555555]">
          {order.shippingAddress.line1}
          {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
        </p>
        <p className="text-[#555555]">
          {order.shippingAddress.city}, {order.shippingAddress.district}{' '}
          {order.shippingAddress.postalCode}
        </p>
        <p className="mt-2 capitalize text-[#555555]">Payment: {order.paymentMethod}</p>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<AccountPanelSkeleton />}>
      <OrderDetailInner />
    </Suspense>
  );
}

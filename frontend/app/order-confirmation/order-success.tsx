'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  CreditCard,
  Download,
  MapPin,
  Package,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { formatTaka } from '@/lib/currency';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';
import {
  useAccountOrder,
  useDownloadInvoice,
  useTrackedOrder,
  type CustomerOrder,
} from '@/features/account';
import { trackPurchase } from '@/features/analytics/facebook-pixel';

const PAYMENT_METHOD_LABEL: Record<CustomerOrder['paymentMethod'], string> = {
  cod: 'Cash on Delivery',
  bkash: 'bKash',
  card: 'Card',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  collected: 'Paid',
  cancelled: 'Cancelled',
};

function readLastOrder(): CustomerOrder | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('elevate:lastOrder');
    return raw ? (JSON.parse(raw) as CustomerOrder) : null;
  } catch {
    return null;
  }
}

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function estimatedDelivery(createdAt: string | undefined): string {
  if (!createdAt) return '3–5 business days';
  const base = new Date(createdAt);
  const from = new Date(base);
  from.setDate(from.getDate() + 3);
  const to = new Date(base);
  to.setDate(to.getDate() + 6);
  const fmt = (date: Date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return `${fmt(from)} – ${fmt(to)}`;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="text-[13px] text-[#555555]">{label}</dt>
      <dd className="text-right text-[13px] font-semibold text-[#111111]">{value}</dd>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
      <div className="mb-3 flex items-center gap-2 border-b border-[#E5E7EB] pb-3">
        <span className="text-[#C9A227]">{icon}</span>
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function OrderSuccess() {
  const searchParams = useSearchParams();
  const orderNumberParam = searchParams.get('order')?.trim() || null;
  const orderIdParam = searchParams.get('id')?.trim() || null;
  const emailParam = searchParams.get('email')?.trim() || null;

  const user = useAppSelector(selectAuthUser);
  const [cachedOrder] = useState(readLastOrder);
  const tracked = useRef(false);

  const orderId = orderIdParam ?? (user ? cachedOrder?.id : undefined) ?? undefined;
  const orderQuery = useAccountOrder(user?.id, user ? orderId : undefined);
  const trackedQuery = useTrackedOrder(
    orderNumberParam ?? '',
    emailParam ?? '',
    !user && Boolean(orderNumberParam && emailParam),
  );

  const order = useMemo<CustomerOrder | null>(() => {
    if (orderQuery.data) return orderQuery.data;
    if (cachedOrder && (!orderNumberParam || cachedOrder.number === orderNumberParam)) {
      return cachedOrder;
    }
    return trackedQuery.data ?? null;
  }, [orderQuery.data, cachedOrder, orderNumberParam, trackedQuery.data]);

  const displayNumber = order?.number ?? orderNumberParam;
  const downloadEmail = order?.email ?? emailParam ?? undefined;

  const downloadInvoice = useDownloadInvoice();

  useEffect(() => {
    if (!order || tracked.current) return;
    tracked.current = true;
    trackPurchase({
      content_ids: order.items.map((item) => item.productId),
      value: order.total,
      order_id: order.number,
    });
  }, [order]);

  const canDownload = Boolean((user && order?.id) || (displayNumber && downloadEmail));

  const handleDownload = () => {
    if (user && order?.id) {
      downloadInvoice.mutate({ orderNumber: order.number, orderId: order.id });
      return;
    }
    if (displayNumber && downloadEmail) {
      downloadInvoice.mutate({ orderNumber: displayNumber, email: downloadEmail });
    }
  };

  const trackHref = displayNumber
    ? `/track-order?number=${encodeURIComponent(displayNumber)}${
        downloadEmail ? `&email=${encodeURIComponent(downloadEmail)}` : ''
      }`
    : '/track-order';

  const totalItems = order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]">
      <section className="mx-auto max-w-3xl px-5 py-10 sm:px-7 sm:py-14">
        {/* Success hero */}
        <div className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-green-50 ring-1 ring-green-200">
            <CheckCircle2 className="size-9 text-green-600" strokeWidth={1.6} />
          </span>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
            Order Confirmed
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.02em] text-[#111111]">
            Thank you for your order
          </h1>
          <p className="mt-3 max-w-md text-sm text-[#555555]">
            {displayNumber ? (
              <>
                Your order <span className="font-semibold text-[#111111]">#{displayNumber}</span>{' '}
                has been placed successfully. A confirmation has been sent
                {downloadEmail ? (
                  <>
                    {' '}
                    to <span className="font-semibold text-[#111111]">{downloadEmail}</span>
                  </>
                ) : (
                  ' to your email'
                )}
                .
              </>
            ) : (
              'Your order has been placed successfully. A confirmation has been sent to your email.'
            )}
          </p>
        </div>

        {order ? (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <SectionCard
                icon={<Package className="size-4" strokeWidth={1.7} />}
                title="Order Information"
              >
                <dl className="divide-y divide-[#F0F0F0]">
                  <InfoRow label="Order Number" value={`#${order.number}`} />
                  <InfoRow label="Invoice Number" value={`INV-${order.number}`} />
                  <InfoRow label="Order Date" value={formatDate(order.createdAt)} />
                  <InfoRow
                    label="Payment Method"
                    value={PAYMENT_METHOD_LABEL[order.paymentMethod]}
                  />
                  <InfoRow
                    label="Payment Status"
                    value={PAYMENT_STATUS_LABEL[order.paymentStatus ?? 'pending'] ?? 'Pending'}
                  />
                  <InfoRow
                    label="Order Status"
                    value={<span className="capitalize">{order.status}</span>}
                  />
                  <InfoRow
                    label="Delivery Method"
                    value={
                      <span className="inline-flex items-center gap-1">
                        <Truck className="size-3.5 text-[#555555]" strokeWidth={1.7} /> Standard
                      </span>
                    }
                  />
                  <InfoRow label="Est. Delivery" value={estimatedDelivery(order.createdAt)} />
                </dl>
              </SectionCard>

              <SectionCard
                icon={<MapPin className="size-4" strokeWidth={1.7} />}
                title="Customer Information"
              >
                <dl className="divide-y divide-[#F0F0F0]">
                  <InfoRow label="Name" value={order.shippingAddress.fullName} />
                  <InfoRow
                    label="Phone"
                    value={order.shippingAddress.phone || order.phone || '—'}
                  />
                  <InfoRow label="Email" value={downloadEmail ?? '—'} />
                </dl>
                <div className="mt-3 border-t border-[#F0F0F0] pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#555555]">
                    Shipping Address
                  </p>
                  <p className="mt-1.5 text-[13px] text-[#111111]">
                    {order.shippingAddress.line1}
                    {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
                  </p>
                  <p className="text-[13px] text-[#555555]">
                    {order.shippingAddress.city}, {order.shippingAddress.district}{' '}
                    {order.shippingAddress.postalCode}
                  </p>
                  <p className="text-[13px] text-[#555555]">{order.shippingAddress.country}</p>
                </div>
              </SectionCard>
            </div>

            {/* Items + payment summary */}
            <div className="mt-4">
              <SectionCard
                icon={<ShoppingBag className="size-4" strokeWidth={1.7} />}
                title={`Order Summary · ${totalItems} item${totalItems === 1 ? '' : 's'}`}
              >
                <ul className="space-y-3">
                  {order.items.map((item) => (
                    <li
                      key={`${item.productId}-${item.size}-${item.color}`}
                      className="flex items-center gap-3"
                    >
                      <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-[4px] bg-[#e4e3e1]">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/product/${item.slug}`}
                          className="line-clamp-1 text-[13px] font-semibold text-[#111111] hover:text-[#C9A227]"
                        >
                          {item.name}
                        </Link>
                        <p className="text-[12px] text-[#555555]">
                          {item.color} / {item.size} × {item.quantity}
                        </p>
                      </div>
                      <p className="shrink-0 text-[13px] font-semibold text-[#111111]">
                        {formatTaka(item.lineTotal ?? item.unitPrice * item.quantity)}
                      </p>
                    </li>
                  ))}
                </ul>

                <dl className="mt-4 space-y-1 border-t border-[#E5E7EB] pt-4">
                  <InfoRow label="Subtotal" value={formatTaka(order.subtotal)} />
                  {order.discount > 0 ? (
                    <InfoRow
                      label={order.couponCode ? `Discount (${order.couponCode})` : 'Discount'}
                      value={<span className="text-green-700">−{formatTaka(order.discount)}</span>}
                    />
                  ) : null}
                  <InfoRow
                    label="Shipping"
                    value={order.shipping === 0 ? 'Free' : formatTaka(order.shipping)}
                  />
                  <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-3">
                    <dt className="text-sm font-bold text-[#111111]">Grand Total</dt>
                    <dd className="text-base font-extrabold text-[#C9A227]">
                      {formatTaka(order.total)}
                    </dd>
                  </div>
                </dl>
              </SectionCard>
            </div>
          </>
        ) : (
          <div className="mt-8 rounded-lg border border-[#E5E7EB] bg-white p-6 text-center text-sm text-[#555555]">
            We&apos;ve received your order. Use Track Order with your order number and email to view
            full details anytime.
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!canDownload || downloadInvoice.isPending}
            className="inline-flex items-center gap-2 rounded-[4px] border border-[#111111] bg-[#111111] px-5 py-3 text-[11px] font-bold uppercase tracking-[.08em] text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="size-4" strokeWidth={1.8} />
            {downloadInvoice.isPending ? 'Preparing…' : 'Download Invoice'}
          </button>
          {user && order?.id ? (
            <Link
              href={`/account/orders/${order.id}`}
              className="inline-flex items-center gap-2 rounded-[4px] border border-[#111111] bg-white px-5 py-3 text-[11px] font-bold uppercase tracking-[.08em] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
            >
              View Order
            </Link>
          ) : null}
          <Link
            href={trackHref}
            className="inline-flex items-center gap-2 rounded-[4px] border border-[#111111] bg-white px-5 py-3 text-[11px] font-bold uppercase tracking-[.08em] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
          >
            <CreditCard className="size-4" strokeWidth={1.7} />
            Track Order
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded-[4px] border border-[#E5E7EB] bg-white px-5 py-3 text-[11px] font-bold uppercase tracking-[.08em] text-[#555555] transition-colors hover:border-[#C9A227] hover:text-[#111111]"
          >
            Continue Shopping
          </Link>
        </div>
      </section>
    </main>
  );
}

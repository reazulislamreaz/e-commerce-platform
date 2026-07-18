'use client';

import Link from 'next/link';
import {
  useAdminContact,
  useAdminCoupons,
  useAdminOrders,
  useAdminReturns,
  useAdminReviews,
} from '@/features/admin';
import { AdminEmpty, AdminError, AdminPanel, StatusPill } from '@/components/admin/admin-ui';
import { formatTaka } from '@/lib/currency';

export default function AdminDashboardPage() {
  const orders = useAdminOrders({ limit: 5, status: 'CONFIRMED' });
  const processing = useAdminOrders({ limit: 5, status: 'PROCESSING' });
  const returns = useAdminReturns({ limit: 5, status: 'PENDING' });
  const reviews = useAdminReviews({ limit: 5, status: 'PENDING' });
  const contact = useAdminContact({ limit: 5, status: 'NEW' });
  const coupons = useAdminCoupons();

  const cards = [
    {
      label: 'Confirmed orders',
      href: '/admin/orders?status=CONFIRMED',
      count: orders.data?.data.length ?? 0,
      loading: orders.isLoading,
    },
    {
      label: 'Processing orders',
      href: '/admin/orders?status=PROCESSING',
      count: processing.data?.data.length ?? 0,
      loading: processing.isLoading,
    },
    {
      label: 'Pending returns',
      href: '/admin/returns?status=PENDING',
      count: returns.data?.data.length ?? 0,
      loading: returns.isLoading,
    },
    {
      label: 'Pending reviews',
      href: '/admin/reviews?status=PENDING',
      count: reviews.data?.data.length ?? 0,
      loading: reviews.isLoading,
    },
    {
      label: 'New contact messages',
      href: '/admin/contact?status=NEW',
      count: contact.data?.data.length ?? 0,
      loading: contact.isLoading,
    },
    {
      label: 'Active coupons',
      href: '/admin/coupons',
      count: coupons.data?.filter((coupon) => coupon.status === 'ACTIVE').length ?? 0,
      loading: coupons.isLoading,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-4 transition-colors hover:border-[#e3bb78]"
          >
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#b5b0a8]">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {card.loading ? '—' : card.count}
            </p>
          </Link>
        ))}
      </div>

      <AdminPanel title="Needs attention" description="Latest actionable fulfillment items.">
        {orders.isError || returns.isError || reviews.isError ? (
          <AdminError>Could not load dashboard queues.</AdminError>
        ) : null}
        <div className="space-y-3">
          {(orders.data?.data ?? []).slice(0, 3).map((order) => (
            <Link
              key={order.id}
              href={`/admin/orders/${order.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[4px] border border-[#2d2a27] px-3 py-2.5 hover:border-[#e3bb78]"
            >
              <div>
                <p className="font-semibold text-white">#{order.number}</p>
                <p className="text-xs text-[#b5b0a8]">
                  {order.email ?? order.shippingAddress.fullName} · {formatTaka(order.total)}
                </p>
              </div>
              <StatusPill>{order.status}</StatusPill>
            </Link>
          ))}
          {(returns.data?.data ?? []).slice(0, 2).map((item) => (
            <Link
              key={item.id}
              href={`/admin/returns/${item.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[4px] border border-[#2d2a27] px-3 py-2.5 hover:border-[#e3bb78]"
            >
              <div>
                <p className="font-semibold text-white">Return {item.orderNumber}</p>
                <p className="text-xs text-[#b5b0a8]">{item.reason}</p>
              </div>
              <StatusPill>{item.status}</StatusPill>
            </Link>
          ))}
          {(reviews.data?.data ?? []).slice(0, 2).map((review) => (
            <Link
              key={review.id}
              href={`/admin/reviews/${review.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[4px] border border-[#2d2a27] px-3 py-2.5 hover:border-[#e3bb78]"
            >
              <div>
                <p className="font-semibold text-white">{review.productName}</p>
                <p className="text-xs text-[#b5b0a8]">
                  {review.rating}/5 · {review.title}
                </p>
              </div>
              <StatusPill>{review.status}</StatusPill>
            </Link>
          ))}
          {!orders.isLoading &&
          !returns.isLoading &&
          !reviews.isLoading &&
          (orders.data?.data.length ?? 0) +
            (returns.data?.data.length ?? 0) +
            (reviews.data?.data.length ?? 0) ===
            0 ? (
            <AdminEmpty>No pending operations right now.</AdminEmpty>
          ) : null}
        </div>
      </AdminPanel>
    </div>
  );
}

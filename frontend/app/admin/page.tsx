'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  Mail,
  Package,
  PackageCheck,
  Plus,
  RotateCcw,
  Star,
  Tag,
} from 'lucide-react';
import {
  useAdminContact,
  useAdminCoupons,
  useAdminOrders,
  useAdminReturns,
  useAdminReviews,
} from '@/features/admin';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminPanel,
  AdminSkeleton,
  AdminTable,
  AdminTd,
  AdminTh,
  StatusPill,
} from '@/components/admin/admin-ui';
import { formatTaka } from '@/lib/currency';

export default function AdminDashboardPage() {
  const orders = useAdminOrders({ limit: 5, status: 'CONFIRMED' });
  const processing = useAdminOrders({ limit: 5, status: 'PROCESSING' });
  const returns = useAdminReturns({ limit: 5, status: 'PENDING' });
  const reviews = useAdminReviews({ limit: 5, status: 'PENDING' });
  const contact = useAdminContact({ limit: 5, status: 'NEW' });
  const coupons = useAdminCoupons();
  const recentOrders = useAdminOrders({ limit: 6 });

  const cards = [
    {
      label: 'Confirmed orders',
      hint: 'Awaiting processing',
      href: '/admin/orders?status=CONFIRMED',
      icon: Package,
      count: orders.data?.data.length ?? 0,
      more: Boolean(orders.data?.meta.nextCursor),
      loading: orders.isLoading,
    },
    {
      label: 'Processing orders',
      hint: 'Ready to ship',
      href: '/admin/orders?status=PROCESSING',
      icon: PackageCheck,
      count: processing.data?.data.length ?? 0,
      more: Boolean(processing.data?.meta.nextCursor),
      loading: processing.isLoading,
    },
    {
      label: 'Pending returns',
      hint: 'Needs a decision',
      href: '/admin/returns?status=PENDING',
      icon: RotateCcw,
      count: returns.data?.data.length ?? 0,
      more: Boolean(returns.data?.meta.nextCursor),
      loading: returns.isLoading,
    },
    {
      label: 'Pending reviews',
      hint: 'Moderation queue',
      href: '/admin/reviews?status=PENDING',
      icon: Star,
      count: reviews.data?.data.length ?? 0,
      more: Boolean(reviews.data?.meta.nextCursor),
      loading: reviews.isLoading,
    },
    {
      label: 'New contact messages',
      hint: 'Unread inbox',
      href: '/admin/contact?status=NEW',
      icon: Mail,
      count: contact.data?.data.length ?? 0,
      more: Boolean(contact.data?.meta.nextCursor),
      loading: contact.isLoading,
    },
    {
      label: 'Active coupons',
      hint: 'Live promotions',
      href: '/admin/coupons',
      icon: Tag,
      count: coupons.data?.filter((coupon) => coupon.status === 'ACTIVE').length ?? 0,
      more: false,
      loading: coupons.isLoading,
    },
  ];

  const attentionCount =
    (orders.data?.data.length ?? 0) +
    (returns.data?.data.length ?? 0) +
    (reviews.data?.data.length ?? 0);

  return (
    <div className="space-y-6">
      {/* Page heading + quick actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-[-.02em] text-white sm:text-2xl">
            Overview
          </h1>
          <p className="mt-1 text-sm text-[#b5b0a8]">
            Everything that needs your attention across the store.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/products">
            <AdminButton>
              <Plus className="size-3.5" strokeWidth={2} />
              New product
            </AdminButton>
          </Link>
          <Link href="/admin/coupons">
            <AdminButton variant="secondary">
              <Tag className="size-3.5" strokeWidth={1.7} />
              Coupons
            </AdminButton>
          </Link>
          <Link href="/admin/reviews?status=PENDING">
            <AdminButton variant="secondary">
              <Star className="size-3.5" strokeWidth={1.7} />
              Moderate reviews
            </AdminButton>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-xl border border-[#26231f] bg-[#111110] p-5 shadow-[0_1px_2px_rgba(0,0,0,.35)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#e3bb78]/50 hover:shadow-[0_10px_30px_-12px_rgba(227,187,120,.15)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3bb78]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg border border-[#37332c] bg-[#1a1815] text-[#e3bb78]">
                  <Icon className="size-4" strokeWidth={1.7} />
                </span>
                <ArrowUpRight
                  className="size-4 text-[#57534b] transition-colors group-hover:text-[#e3bb78]"
                  strokeWidth={1.7}
                />
              </div>
              {card.loading ? (
                <AdminSkeleton className="mt-4 h-9 w-16" />
              ) : (
                <p className="mt-4 text-3xl font-extrabold tracking-[-.02em] text-white">
                  {card.count}
                  {card.more ? <span className="text-lg text-[#e3bb78]">+</span> : null}
                </p>
              )}
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
                {card.label}
              </p>
              <p className="mt-0.5 text-xs text-[#6f6a61]">{card.hint}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Recent orders */}
        <AdminPanel
          title="Recent orders"
          description="Latest orders across every status."
          actions={
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[.08em] text-[#e3bb78] transition-colors hover:text-[#eec98a]"
            >
              View all
              <ArrowUpRight className="size-3.5" strokeWidth={1.7} />
            </Link>
          }
        >
          {recentOrders.isError ? <AdminError>Could not load recent orders.</AdminError> : null}
          {recentOrders.isLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <AdminSkeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : null}
          {!recentOrders.isLoading && (recentOrders.data?.data.length ?? 0) === 0 ? (
            <AdminEmpty>No orders yet. New orders will appear here automatically.</AdminEmpty>
          ) : null}
          {(recentOrders.data?.data.length ?? 0) > 0 ? (
            <AdminTable>
              <thead>
                <tr>
                  <AdminTh>Order</AdminTh>
                  <AdminTh>Customer</AdminTh>
                  <AdminTh>Total</AdminTh>
                  <AdminTh>Status</AdminTh>
                </tr>
              </thead>
              <tbody>
                {recentOrders.data?.data.map((order) => (
                  <tr key={order.id}>
                    <AdminTd>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-semibold text-white transition-colors hover:text-[#e3bb78]"
                      >
                        #{order.number}
                      </Link>
                      <p className="mt-0.5 text-xs text-[#6f6a61]">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[#d8d4cd]">
                        {order.email ?? order.shippingAddress.fullName}
                      </span>
                    </AdminTd>
                    <AdminTd>
                      <span className="font-semibold text-[#e5c17d]">{formatTaka(order.total)}</span>
                    </AdminTd>
                    <AdminTd>
                      <StatusPill>{order.status}</StatusPill>
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          ) : null}
        </AdminPanel>

        {/* Needs attention */}
        <AdminPanel
          title="Needs attention"
          description="Latest actionable fulfillment and moderation items."
        >
          {orders.isError || returns.isError || reviews.isError ? (
            <AdminError>Could not load dashboard queues.</AdminError>
          ) : null}
          {orders.isLoading || returns.isLoading || reviews.isLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <AdminSkeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : null}
          <div className="space-y-2.5">
            {(orders.data?.data ?? []).slice(0, 3).map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#26231f] bg-white/[0.015] px-3.5 py-3 transition-colors hover:border-[#e3bb78]/50 hover:bg-[#e3bb78]/[0.04]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">#{order.number}</p>
                  <p className="truncate text-xs text-[#b5b0a8]">
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
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#26231f] bg-white/[0.015] px-3.5 py-3 transition-colors hover:border-[#e3bb78]/50 hover:bg-[#e3bb78]/[0.04]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">Return {item.orderNumber}</p>
                  <p className="truncate text-xs text-[#b5b0a8]">{item.reason}</p>
                </div>
                <StatusPill>{item.status}</StatusPill>
              </Link>
            ))}
            {(reviews.data?.data ?? []).slice(0, 2).map((review) => (
              <Link
                key={review.id}
                href={`/admin/reviews/${review.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#26231f] bg-white/[0.015] px-3.5 py-3 transition-colors hover:border-[#e3bb78]/50 hover:bg-[#e3bb78]/[0.04]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{review.productName}</p>
                  <p className="truncate text-xs text-[#b5b0a8]">
                    {review.rating}/5 · {review.title}
                  </p>
                </div>
                <StatusPill>{review.status}</StatusPill>
              </Link>
            ))}
            {!orders.isLoading && !returns.isLoading && !reviews.isLoading && attentionCount === 0 ? (
              <AdminEmpty>All caught up — no pending operations right now.</AdminEmpty>
            ) : null}
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}

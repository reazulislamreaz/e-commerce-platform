'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  ArrowUpRight,
  Banknote,
  BarChart3,
  ImageIcon,
  Mail,
  Package,
  PackageCheck,
  Plus,
  RotateCcw,
  Shirt,
  Star,
  Tag,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useAdminCoupons, useAdminOrders, useAdminQueues, type AdminOrder } from '@/features/admin';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminPageHeader,
  AdminPanel,
  AdminSkeleton,
  AdminTable,
  AdminTd,
  AdminTh,
  StatusPill,
} from '@/components/admin/admin-ui';
import { AreaChart, DonutChart, MeterBar, Sparkline } from '@/components/admin/admin-charts';
import { formatTaka } from '@/lib/currency';
import { cn } from '@/lib/utils';

const DAY_MS = 86_400_000;

const TONES = {
  gold: { tile: 'border-[#e3bb78]/25 bg-[#e3bb78]/10 text-[#e3bb78]', spark: 'text-[#e3bb78]' },
  violet: {
    tile: 'border-violet-500/25 bg-violet-500/10 text-violet-300',
    spark: 'text-violet-400',
  },
  sky: { tile: 'border-sky-500/25 bg-sky-500/10 text-sky-300', spark: 'text-sky-400' },
  emerald: {
    tile: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    spark: 'text-emerald-400',
  },
  rose: { tile: 'border-rose-500/25 bg-rose-500/10 text-rose-300', spark: 'text-rose-400' },
  orange: {
    tile: 'border-orange-500/25 bg-orange-500/10 text-orange-300',
    spark: 'text-orange-400',
  },
} as const;

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#38bdf8',
  DELIVERED: '#34d399',
  PROCESSING: '#a78bfa',
  PENDING: '#fbbf24',
  SHIPPED: '#60a5fa',
  CANCELLED: '#f87171',
  RETURNED: '#fb7185',
};

function dayStart(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

function lastDays(count: number): number[] {
  const today = dayStart(new Date());
  return Array.from({ length: count }, (_, index) => today - (count - 1 - index) * DAY_MS);
}

/** Buckets timestamps into per-day counts for the trailing seven days. */
function dailyCounts(timestamps: Array<string | undefined>): number[] {
  const days = lastDays(7);
  const counts = days.map(() => 0);
  for (const timestamp of timestamps) {
    if (!timestamp) continue;
    const bucket = dayStart(new Date(timestamp));
    const index = days.indexOf(bucket);
    if (index >= 0) counts[index] += 1;
  }
  return counts;
}

function useOrderAnalytics(orders: AdminOrder[]) {
  return useMemo(() => {
    const days = lastDays(7);
    const revenueByDay = days.map(() => 0);
    let revenue7 = 0;
    let revenuePrev7 = 0;
    const statusCounts = new Map<string, number>();
    const productUnits = new Map<string, { name: string; units: number }>();

    const windowStart = days[0];
    const prevWindowStart = windowStart - 7 * DAY_MS;

    for (const order of orders) {
      const createdAt = new Date(order.createdAt).getTime();
      const bucket = dayStart(new Date(order.createdAt));
      const dayIndex = days.indexOf(bucket);
      if (dayIndex >= 0) {
        revenueByDay[dayIndex] += order.total;
        revenue7 += order.total;
      } else if (createdAt >= prevWindowStart && createdAt < windowStart) {
        revenuePrev7 += order.total;
      }

      const status = order.status.toUpperCase();
      statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);

      for (const item of order.items) {
        const entry = productUnits.get(item.productId) ?? { name: item.name, units: 0 };
        entry.units += item.quantity;
        productUnits.set(item.productId, entry);
      }
    }

    const totalUnits = [...productUnits.values()].reduce((sum, entry) => sum + entry.units, 0);
    const topProducts = [...productUnits.entries()]
      .map(([productId, entry]) => ({
        productId,
        name: entry.name,
        units: entry.units,
        share: totalUnits > 0 ? (entry.units / totalUnits) * 100 : 0,
      }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 4);

    const revenueDelta = revenuePrev7 > 0 ? ((revenue7 - revenuePrev7) / revenuePrev7) * 100 : null;

    const salesPoints = days.map((day, index) => ({
      label: new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: revenueByDay[index],
    }));

    const donutSegments = Object.entries(STATUS_COLORS)
      .map(([status, color]) => ({
        label: status,
        value: statusCounts.get(status) ?? 0,
        color,
      }))
      .filter((segment) => segment.value > 0);

    return { revenue7, revenueDelta, revenueByDay, salesPoints, donutSegments, topProducts };
  }, [orders]);
}

export default function AdminDashboardPage() {
  const { confirmedOrders, processingOrders, pendingReturns, pendingReviews, newContact } =
    useAdminQueues();
  const coupons = useAdminCoupons();
  const recentOrders = useAdminOrders({ limit: 50 });

  const orderRows = useMemo(() => recentOrders.data?.data ?? [], [recentOrders.data]);
  const analytics = useOrderAnalytics(orderRows);
  const activeCoupons = coupons.data?.filter((coupon) => coupon.status === 'ACTIVE') ?? [];

  const cards = [
    {
      label: 'Confirmed Orders',
      hint: 'Awaiting processing',
      href: '/admin/orders?status=CONFIRMED',
      icon: Package,
      tone: TONES.gold,
      count: confirmedOrders.data?.data.length ?? 0,
      more: Boolean(confirmedOrders.data?.meta.nextCursor),
      loading: confirmedOrders.isLoading,
      trend: dailyCounts((confirmedOrders.data?.data ?? []).map((row) => row.createdAt)),
    },
    {
      label: 'Processing Orders',
      hint: 'Ready to ship',
      href: '/admin/orders?status=PROCESSING',
      icon: PackageCheck,
      tone: TONES.violet,
      count: processingOrders.data?.data.length ?? 0,
      more: Boolean(processingOrders.data?.meta.nextCursor),
      loading: processingOrders.isLoading,
      trend: dailyCounts((processingOrders.data?.data ?? []).map((row) => row.createdAt)),
    },
    {
      label: 'Pending Returns',
      hint: 'Needs a decision',
      href: '/admin/returns?status=PENDING',
      icon: RotateCcw,
      tone: TONES.sky,
      count: pendingReturns.data?.data.length ?? 0,
      more: Boolean(pendingReturns.data?.meta.nextCursor),
      loading: pendingReturns.isLoading,
      trend: dailyCounts((pendingReturns.data?.data ?? []).map((row) => row.createdAt)),
    },
    {
      label: 'Pending Reviews',
      hint: 'Moderation queue',
      href: '/admin/reviews?status=PENDING',
      icon: Star,
      tone: TONES.emerald,
      count: pendingReviews.data?.data.length ?? 0,
      more: Boolean(pendingReviews.data?.meta.nextCursor),
      loading: pendingReviews.isLoading,
      trend: dailyCounts((pendingReviews.data?.data ?? []).map((row) => row.createdAt)),
    },
    {
      label: 'Active Coupons',
      hint: 'Live promotions',
      href: '/admin/coupons',
      icon: Tag,
      tone: TONES.rose,
      count: activeCoupons.length,
      more: false,
      loading: coupons.isLoading,
      trend: dailyCounts(activeCoupons.map((coupon) => coupon.startsAt)),
    },
    {
      label: 'New Messages',
      hint: 'Unread inbox',
      href: '/admin/contact?status=NEW',
      icon: Mail,
      tone: TONES.orange,
      count: newContact.data?.data.length ?? 0,
      more: Boolean(newContact.data?.meta.nextCursor),
      loading: newContact.isLoading,
      trend: dailyCounts((newContact.data?.data ?? []).map((row) => row.createdAt)),
    },
  ];

  const attentionCount =
    (confirmedOrders.data?.data.length ?? 0) +
    (pendingReturns.data?.data.length ?? 0) +
    (pendingReviews.data?.data.length ?? 0);

  const totalStatusCount = analytics.donutSegments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={
          <>
            Dashboard Overview <span aria-hidden>👋</span>
          </>
        }
        description="Here's what's happening with your store today."
        actions={
          <>
            <Link href="/admin/products">
              <AdminButton>
                <Plus className="size-3.5" strokeWidth={2} />
                New product
              </AdminButton>
            </Link>
            <Link href="/admin/analytics">
              <AdminButton variant="secondary">
                <BarChart3 className="size-3.5" strokeWidth={1.7} />
                Analytics
              </AdminButton>
            </Link>
            <Link href="/admin/banners">
              <AdminButton variant="secondary">
                <ImageIcon className="size-3.5" strokeWidth={1.7} />
                Banners
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
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-xl border border-[#26231f] bg-[#111110] p-4 shadow-[0_1px_2px_rgba(0,0,0,.35)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#e3bb78]/50 hover:shadow-[0_10px_30px_-12px_rgba(227,187,120,.15)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3bb78]"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    'flex size-10 items-center justify-center rounded-xl border',
                    card.tone.tile,
                  )}
                >
                  <Icon className="size-4.5" strokeWidth={1.7} />
                </span>
                <ArrowUpRight
                  className="size-4 text-[#57534b] transition-colors group-hover:text-[#e3bb78]"
                  strokeWidth={1.7}
                />
              </div>
              {card.loading ? (
                <AdminSkeleton className="mt-3 h-8 w-14" />
              ) : (
                <p className="mt-3 text-[28px] font-extrabold leading-none tracking-[-.02em] text-white">
                  {card.count}
                  {card.more ? <span className="text-lg text-[#e3bb78]">+</span> : null}
                </p>
              )}
              <p className="mt-2 truncate text-[11px] font-bold uppercase tracking-[.1em] text-[#d8d4cd]">
                {card.label}
              </p>
              <p className="mt-0.5 truncate text-xs text-[#6f6a61]">{card.hint}</p>
              <Sparkline values={card.trend} className={cn('mt-3', card.tone.spark)} />
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Recent orders + revenue */}
        <AdminPanel
          title="Recent orders"
          description="Latest orders across every status."
          actions={
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[.08em] text-[#e3bb78] transition-colors hover:text-[#eec98a]"
            >
              View all orders
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
          {!recentOrders.isLoading && orderRows.length === 0 ? (
            <AdminEmpty>No orders yet. New orders will appear here automatically.</AdminEmpty>
          ) : null}
          {orderRows.length > 0 ? (
            <>
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
                  {orderRows.slice(0, 5).map((order) => (
                    <tr key={order.id}>
                      <AdminTd>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-semibold text-white transition-colors hover:text-[#e3bb78]"
                        >
                          #{order.number}
                        </Link>
                        <p className="mt-0.5 text-xs text-[#6f6a61]">
                          {new Date(order.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </AdminTd>
                      <AdminTd>
                        <span className="text-[#d8d4cd]">
                          {order.email ?? order.shippingAddress.fullName}
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <span className="font-semibold text-[#e5c17d]">
                          {formatTaka(order.total)}
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <StatusPill>{order.status.toUpperCase()}</StatusPill>
                      </AdminTd>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>

              {/* Total revenue banner */}
              <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-[#e3bb78]/25 bg-gradient-to-r from-[#1c150a] via-[#221a0d] to-[#141410] p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#e3bb78]/30 bg-[#e3bb78]/10 text-[#e3bb78]">
                  <Banknote className="size-5" strokeWidth={1.6} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#b5b0a8]">
                    Total revenue
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
                    <p className="text-2xl font-extrabold tracking-[-.02em] text-[#e5c17d]">
                      {formatTaka(analytics.revenue7)}
                    </p>
                    {analytics.revenueDelta !== null ? (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-[11px] font-bold',
                          analytics.revenueDelta >= 0 ? 'text-emerald-300' : 'text-red-300',
                        )}
                      >
                        {analytics.revenueDelta >= 0 ? (
                          <TrendingUp className="size-3.5" strokeWidth={2} />
                        ) : (
                          <TrendingDown className="size-3.5" strokeWidth={2} />
                        )}
                        {analytics.revenueDelta >= 0 ? '+' : ''}
                        {analytics.revenueDelta.toFixed(1)}%
                      </span>
                    ) : null}
                    <span className="text-[11px] text-[#8b867d]">vs last 7 days</span>
                  </div>
                </div>
                <Sparkline
                  values={analytics.revenueByDay}
                  className="ml-auto h-10 w-full max-w-[220px] text-[#e3bb78]"
                />
              </div>
            </>
          ) : null}
        </AdminPanel>

        <div className="space-y-6">
          {/* Needs attention */}
          <AdminPanel
            title="Needs attention"
            description="Latest actionable fulfillment and moderation items."
          >
            {confirmedOrders.isError || pendingReturns.isError || pendingReviews.isError ? (
              <AdminError>Could not load dashboard queues.</AdminError>
            ) : null}
            {confirmedOrders.isLoading || pendingReturns.isLoading || pendingReviews.isLoading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 3 }).map((_, index) => (
                  <AdminSkeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : null}
            <div className="space-y-2.5">
              {(confirmedOrders.data?.data ?? []).slice(0, 3).map((order) => (
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
                  <StatusPill>{order.status.toUpperCase()}</StatusPill>
                </Link>
              ))}
              {(pendingReturns.data?.data ?? []).slice(0, 2).map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/returns/${item.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#26231f] bg-white/[0.015] px-3.5 py-3 transition-colors hover:border-[#e3bb78]/50 hover:bg-[#e3bb78]/[0.04]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">Return {item.orderNumber}</p>
                    <p className="truncate text-xs text-[#b5b0a8]">{item.reason}</p>
                  </div>
                  <StatusPill>{item.status.toUpperCase()}</StatusPill>
                </Link>
              ))}
              {(pendingReviews.data?.data ?? []).slice(0, 2).map((review) => (
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
                  <StatusPill>{review.status.toUpperCase()}</StatusPill>
                </Link>
              ))}
              {!confirmedOrders.isLoading &&
              !pendingReturns.isLoading &&
              !pendingReviews.isLoading &&
              attentionCount === 0 ? (
                <AdminEmpty>All caught up — no pending operations right now.</AdminEmpty>
              ) : null}
            </div>
          </AdminPanel>

          {/* Top selling products */}
          <AdminPanel title="Top selling products" description="By units sold in recent orders.">
            {recentOrders.isLoading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <AdminSkeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : analytics.topProducts.length === 0 ? (
              <AdminEmpty>No sales yet — top products will appear here.</AdminEmpty>
            ) : (
              <div className="space-y-4">
                {analytics.topProducts.map((product) => (
                  <div key={product.productId} className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#37332c] bg-[#1a1815] text-[#e3bb78]">
                      <Shirt className="size-3.5" strokeWidth={1.7} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-white">{product.name}</p>
                        <span className="shrink-0 text-xs font-bold text-[#e3bb78]">
                          {Math.round(product.share)}%
                        </span>
                      </div>
                      <p className="text-xs text-[#8b867d]">
                        {product.units} {product.units === 1 ? 'unit' : 'units'}
                      </p>
                      <MeterBar percent={product.share} className="mt-1.5" />
                    </div>
                  </div>
                ))}
                <Link href="/admin/products" className="block">
                  <AdminButton variant="secondary" className="w-full">
                    Manage products
                    <ArrowUpRight className="size-3.5" strokeWidth={1.7} />
                  </AdminButton>
                </Link>
              </div>
            )}
          </AdminPanel>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Order status overview */}
        <AdminPanel
          title="Order status overview"
          description="Distribution of recent orders by status."
        >
          {recentOrders.isLoading ? (
            <AdminSkeleton className="h-44 w-full" />
          ) : totalStatusCount === 0 ? (
            <AdminEmpty>No orders yet — the status breakdown will appear here.</AdminEmpty>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-6 sm:justify-start">
              <DonutChart
                segments={analytics.donutSegments}
                centerLabel={String(totalStatusCount)}
                centerSub="orders"
              />
              <ul className="min-w-0 flex-1 space-y-2.5">
                {analytics.donutSegments.map((segment) => {
                  const percent = Math.round((segment.value / totalStatusCount) * 100);
                  return (
                    <li key={segment.label} className="flex items-center gap-2.5 text-sm">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="min-w-0 flex-1 truncate capitalize text-[#d8d4cd]">
                        {segment.label.toLowerCase()}
                      </span>
                      <span className="shrink-0 font-semibold text-white">
                        {percent}% <span className="text-[#6f6a61]">({segment.value})</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </AdminPanel>

        {/* Sales overview */}
        <AdminPanel
          title="Sales overview"
          description="Revenue trend for the last 7 days."
          actions={
            <span className="rounded-lg border border-[#37332c] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-[#b5b0a8]">
              Last 7 days
            </span>
          }
        >
          {recentOrders.isError ? <AdminError>Could not load sales data.</AdminError> : null}
          {recentOrders.isLoading ? (
            <AdminSkeleton className="h-44 w-full" />
          ) : (
            <AreaChart points={analytics.salesPoints} formatValue={formatTaka} />
          )}
        </AdminPanel>
      </div>
    </div>
  );
}

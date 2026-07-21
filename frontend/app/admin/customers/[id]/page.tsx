'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
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
import {
  useAdminCustomer,
  useAdminCustomerActivity,
  useAdminCustomerOrders,
  type CustomerActivity,
  type CustomerOrderHistory,
} from '@/features/admin';
import { formatTaka } from '@/lib/currency';

export default function AdminCustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ordersCursor, setOrdersCursor] = useState<string | undefined>();
  const [priorOrders, setPriorOrders] = useState<CustomerOrderHistory[]>([]);
  const [activityCursor, setActivityCursor] = useState<string | undefined>();
  const [priorActivity, setPriorActivity] = useState<CustomerActivity[]>([]);

  const customerQuery = useAdminCustomer(id);
  const ordersQuery = useAdminCustomerOrders(id, {
    limit: 20,
    ...(ordersCursor ? { cursor: ordersCursor } : {}),
  });
  const activityQuery = useAdminCustomerActivity(id, {
    limit: 20,
    ...(activityCursor ? { cursor: activityCursor } : {}),
  });
  const customer = customerQuery.data;

  if (customerQuery.isLoading) {
    return (
      <div className="space-y-5">
        <AdminSkeleton className="h-7 w-48" />
        <AdminSkeleton className="h-44 w-full" />
        <AdminSkeleton className="h-64 w-full" />
      </div>
    );
  }

  if (customerQuery.isError || !customer) {
    return (
      <div className="space-y-3">
        <AdminError>Customer not found or failed to load.</AdminError>
        <Link href="/admin/customers" className="text-xs font-bold uppercase text-[#C9A227]">
          ← Customers
        </Link>
      </div>
    );
  }

  const name =
    [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Unnamed customer';
  const metrics = customer.metrics;
  const orderRows = ordersCursor
    ? [...priorOrders, ...(ordersQuery.data?.data ?? [])]
    : (ordersQuery.data?.data ?? []);
  const activityRows = activityCursor
    ? [...priorActivity, ...(activityQuery.data?.data ?? [])]
    : (activityQuery.data?.data ?? []);
  const ordersNext = ordersQuery.data?.meta.nextCursor ?? null;
  const activityNext = activityQuery.data?.meta.nextCursor ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/customers"
          className="text-[10px] font-bold uppercase tracking-[.08em] text-[#C9A227] hover:text-[#D4B03A]"
        >
          ← Customers
        </Link>
        <StatusPill>{metrics.segment.replaceAll('_', ' ')}</StatusPill>
      </div>

      <AdminPanel
        title={name}
        description={`Customer since ${new Date(customer.createdAt).toLocaleDateString()}`}
      >
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <ProfileItem label="Email" value={customer.email} />
          <ProfileItem label="Phone" value={customer.phone} />
          <ProfileItem label="Account status" value={customer.status.replaceAll('_', ' ')} />
        </dl>
      </AdminPanel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Lifetime value" value={formatTaka(metrics.lifetimeValue)} />
        <MetricCard label="Average order" value={formatTaka(metrics.averageOrderValue)} />
        <MetricCard label="Delivered orders" value={String(metrics.deliveredOrderCount)} />
        <MetricCard label="Wishlist items" value={String(metrics.wishlistItemCount)} />
        <MetricCard label="Returns" value={String(metrics.returnCount)} />
        <MetricCard label="Cancelled" value={String(metrics.cancelledOrderCount)} />
        <MetricCard
          label="First order"
          value={
            metrics.firstOrderAt ? new Date(metrics.firstOrderAt).toLocaleDateString() : 'Never'
          }
        />
        <MetricCard
          label="Last order"
          value={metrics.lastOrderAt ? new Date(metrics.lastOrderAt).toLocaleDateString() : 'Never'}
        />
      </div>

      <AdminPanel title="Purchase history" description="Most recent customer orders.">
        {ordersQuery.isError ? <AdminError>Could not load purchase history.</AdminError> : null}
        {ordersQuery.isLoading && orderRows.length === 0 ? (
          <AdminSkeleton className="h-44 w-full" />
        ) : null}
        {orderRows.length === 0 && !ordersQuery.isLoading ? (
          <AdminEmpty>No orders yet.</AdminEmpty>
        ) : null}
        {orderRows.length > 0 ? (
          <>
            <AdminTable>
              <thead>
                <tr>
                  <AdminTh>Order</AdminTh>
                  <AdminTh>Date</AdminTh>
                  <AdminTh>Items</AdminTh>
                  <AdminTh>Total</AdminTh>
                  <AdminTh>Status</AdminTh>
                </tr>
              </thead>
              <tbody>
                {orderRows.map((order) => (
                  <tr key={order.id}>
                    <AdminTd>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-semibold text-[#C9A227]"
                      >
                        #{order.number}
                      </Link>
                    </AdminTd>
                    <AdminTd>{new Date(order.createdAt).toLocaleDateString()}</AdminTd>
                    <AdminTd>{order.itemCount}</AdminTd>
                    <AdminTd>{formatTaka(order.total)}</AdminTd>
                    <AdminTd>
                      <StatusPill>{order.status}</StatusPill>
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
            {ordersNext ? (
              <div className="mt-4">
                <AdminButton
                  type="button"
                  variant="ghost"
                  disabled={ordersQuery.isFetching}
                  onClick={() => {
                    setPriorOrders(orderRows);
                    setOrdersCursor(ordersNext);
                  }}
                >
                  {ordersQuery.isFetching ? 'Loading…' : 'Load more orders'}
                </AdminButton>
              </div>
            ) : null}
          </>
        ) : null}
      </AdminPanel>

      <AdminPanel
        title="Activity timeline"
        description="Commerce events recorded for this customer."
      >
        {activityQuery.isError ? <AdminError>Could not load customer activity.</AdminError> : null}
        {activityQuery.isLoading && activityRows.length === 0 ? (
          <AdminSkeleton className="h-40 w-full" />
        ) : null}
        {activityRows.length === 0 && !activityQuery.isLoading ? (
          <AdminEmpty>No activity recorded yet.</AdminEmpty>
        ) : null}
        <ol className="space-y-0">
          {activityRows.map((event) => {
            const href = toAdminActivityHref(event.href);
            return (
              <li key={event.id} className="relative border-l border-[#E5E7EB] pb-6 pl-6 last:pb-0">
                <span className="absolute -left-1.5 top-1 size-3 rounded-full border-2 border-[#FAFAFA] bg-[#C9A227]" />
                {href ? (
                  <Link
                    href={href}
                    className="text-sm font-semibold text-[#111111] hover:text-[#C9A227]"
                  >
                    {event.title}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold text-[#111111]">{event.title}</p>
                )}
                <p className="mt-1 text-xs text-[#555555]">
                  {event.eventType.replaceAll('_', ' ')} ·{' '}
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </li>
            );
          })}
        </ol>
        {activityNext ? (
          <div className="mt-4">
            <AdminButton
              type="button"
              variant="ghost"
              disabled={activityQuery.isFetching}
              onClick={() => {
                setPriorActivity(activityRows);
                setActivityCursor(activityNext);
              }}
            >
              {activityQuery.isFetching ? 'Loading…' : 'Load more activity'}
            </AdminButton>
          </div>
        ) : null}
      </AdminPanel>
    </div>
  );
}

/** Map storefront activity deep links to the matching admin surface. */
function toAdminActivityHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  const orderMatch = href.match(/^\/account\/orders\/([^/?#]+)/);
  if (orderMatch) return `/admin/orders/${orderMatch[1]}`;
  if (href.startsWith('/account/returns') || href.startsWith('/account/exchanges')) {
    return '/admin/returns';
  }
  if (href.startsWith('/admin/')) return href;
  return undefined;
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">{label}</dt>
      <dd className="mt-1 text-[#111111]">{value}</dd>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">{label}</p>
      <p className="mt-2 text-xl font-extrabold text-[#C9A227]">{value}</p>
    </div>
  );
}

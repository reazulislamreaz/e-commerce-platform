'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
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
} from '@/features/admin';
import { formatTaka } from '@/lib/currency';

export default function AdminCustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const customerQuery = useAdminCustomer(id);
  const ordersQuery = useAdminCustomerOrders(id);
  const activityQuery = useAdminCustomerActivity(id);
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
        <Link href="/admin/customers" className="text-xs font-bold uppercase text-[#e3bb78]">
          ← Customers
        </Link>
      </div>
    );
  }

  const name =
    [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Unnamed customer';
  const metrics = customer.metrics;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/customers"
          className="text-[10px] font-bold uppercase tracking-[.08em] text-[#e3bb78] hover:text-[#eec98a]"
        >
          ← Customers
        </Link>
        <StatusPill>{metrics.segment.replaceAll('_', ' ')}</StatusPill>
      </div>

      <AdminPanel title={name} description={`Customer since ${new Date(customer.createdAt).toLocaleDateString()}`}>
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
          value={metrics.firstOrderAt ? new Date(metrics.firstOrderAt).toLocaleDateString() : 'Never'}
        />
        <MetricCard
          label="Last order"
          value={metrics.lastOrderAt ? new Date(metrics.lastOrderAt).toLocaleDateString() : 'Never'}
        />
      </div>

      <AdminPanel title="Purchase history" description="Most recent customer orders.">
        {ordersQuery.isError ? <AdminError>Could not load purchase history.</AdminError> : null}
        {ordersQuery.isLoading ? <AdminSkeleton className="h-44 w-full" /> : null}
        {ordersQuery.data?.data.length === 0 ? <AdminEmpty>No orders yet.</AdminEmpty> : null}
        {(ordersQuery.data?.data.length ?? 0) > 0 ? (
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
              {ordersQuery.data?.data.map((order) => (
                <tr key={order.id}>
                  <AdminTd>
                    <Link href={`/admin/orders/${order.id}`} className="font-semibold text-[#e3bb78]">
                      #{order.number}
                    </Link>
                  </AdminTd>
                  <AdminTd>{new Date(order.createdAt).toLocaleDateString()}</AdminTd>
                  <AdminTd>{order.itemCount}</AdminTd>
                  <AdminTd>{formatTaka(order.total)}</AdminTd>
                  <AdminTd><StatusPill>{order.status}</StatusPill></AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : null}
      </AdminPanel>

      <AdminPanel title="Activity timeline" description="Commerce events recorded for this customer.">
        {activityQuery.isError ? <AdminError>Could not load customer activity.</AdminError> : null}
        {activityQuery.isLoading ? <AdminSkeleton className="h-40 w-full" /> : null}
        {activityQuery.data?.data.length === 0 ? <AdminEmpty>No activity recorded yet.</AdminEmpty> : null}
        <ol className="space-y-0">
          {activityQuery.data?.data.map((event) => (
            <li key={event.id} className="relative border-l border-[#37332c] pb-6 pl-6 last:pb-0">
              <span className="absolute -left-1.5 top-1 size-3 rounded-full border-2 border-[#0a0a0b] bg-[#e5bd79]" />
              {event.href ? (
                <Link href={event.href} className="text-sm font-semibold text-white hover:text-[#e3bb78]">
                  {event.title}
                </Link>
              ) : (
                <p className="text-sm font-semibold text-white">{event.title}</p>
              )}
              <p className="mt-1 text-xs text-[#8b867d]">
                {event.eventType.replaceAll('_', ' ')} · {new Date(event.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ol>
      </AdminPanel>
    </div>
  );
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#8b867d]">{label}</dt>
      <dd className="mt-1 text-white">{value}</dd>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#26231f] bg-[#111110] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#8b867d]">{label}</p>
      <p className="mt-2 text-xl font-extrabold text-[#e3bb78]">{value}</p>
    </div>
  );
}

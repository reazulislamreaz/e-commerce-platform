'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, type FormEvent } from 'react';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminInput,
  AdminPageHeader,
  AdminPanel,
  AdminSelect,
  AdminTable,
  AdminTd,
  AdminTh,
  StatusPill,
} from '@/components/admin/admin-ui';
import { AdminTableSkeleton } from '@/components/common/skeleton';
import { useAdminOrders, type AdminOrder } from '@/features/admin';
import { formatTaka } from '@/lib/currency';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'EXCHANGED', label: 'Exchanged' },
] as const;

type OrdersListBodyProps = {
  status: string;
  number: string;
  email: string;
};

function OrdersListBody({ status, number, email }: OrdersListBodyProps) {
  const router = useRouter();
  const [draftStatus, setDraftStatus] = useState(status);
  const [draftNumber, setDraftNumber] = useState(number);
  const [draftEmail, setDraftEmail] = useState(email);
  const [cursor, setCursor] = useState<string | undefined>();
  const [priorRows, setPriorRows] = useState<AdminOrder[]>([]);

  const queryParams = useMemo(
    () => ({
      limit: 20,
      ...(status ? { status } : {}),
      ...(number ? { number } : {}),
      ...(email ? { email } : {}),
      ...(cursor ? { cursor } : {}),
    }),
    [status, number, email, cursor],
  );

  const query = useAdminOrders(queryParams);
  const pageRows = query.data?.data ?? [];
  const rows = cursor ? [...priorRows, ...pageRows] : pageRows;
  const nextCursor = query.data?.meta.nextCursor ?? null;
  const showInitialLoading = query.isLoading && !cursor && rows.length === 0;

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (draftStatus) params.set('status', draftStatus);
    if (draftNumber.trim()) params.set('number', draftNumber.trim());
    if (draftEmail.trim()) params.set('email', draftEmail.trim());
    const qs = params.toString();
    router.push(qs ? `/admin/orders?${qs}` : '/admin/orders');
  }

  function clearFilters() {
    router.push('/admin/orders');
  }

  function loadMore() {
    if (!query.data?.meta.nextCursor) return;
    setPriorRows((prev) => (cursor ? [...prev, ...pageRows] : pageRows));
    setCursor(query.data.meta.nextCursor);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Orders" description="Track, filter, and fulfill customer orders." />
      <AdminPanel
        title="Order queue"
        description="Filter fulfillment queue by status, order number, or customer email."
      >
        <form onSubmit={applyFilters} className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Status
            </span>
            <AdminSelect
              value={draftStatus}
              onChange={(event) => setDraftStatus(event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AdminSelect>
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Order number
            </span>
            <AdminInput
              value={draftNumber}
              onChange={(event) => setDraftNumber(event.target.value)}
              placeholder="EA…"
              autoComplete="off"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Email
            </span>
            <AdminInput
              type="email"
              value={draftEmail}
              onChange={(event) => setDraftEmail(event.target.value)}
              placeholder="customer@example.com"
              autoComplete="off"
            />
          </label>
          <div className="flex items-end gap-2">
            <AdminButton type="submit">Apply</AdminButton>
            <AdminButton type="button" variant="secondary" onClick={clearFilters}>
              Clear
            </AdminButton>
          </div>
        </form>

        {query.isError ? <AdminError>Could not load orders.</AdminError> : null}

        {showInitialLoading ? <AdminTableSkeleton /> : null}

        {!showInitialLoading && !query.isError && rows.length === 0 ? (
          <AdminEmpty>No orders match these filters.</AdminEmpty>
        ) : null}

        {rows.length > 0 ? (
          <>
            <AdminTable>
              <thead>
                <tr>
                  <AdminTh>Number</AdminTh>
                  <AdminTh>Email</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh>Total</AdminTh>
                  <AdminTh>Created</AdminTh>
                  <AdminTh className="text-right">Detail</AdminTh>
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => (
                  <tr key={order.id}>
                    <AdminTd>
                      <span className="font-semibold text-[#111111]">#{order.number}</span>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[#111111]">
                        {order.email ?? order.shippingAddress.fullName}
                      </span>
                    </AdminTd>
                    <AdminTd>
                      <StatusPill>{order.status}</StatusPill>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[#C9A227]">{formatTaka(order.total)}</span>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[#555555]">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </AdminTd>
                    <AdminTd className="text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        prefetch
                        onMouseEnter={() => router.prefetch(`/admin/orders/${order.id}`)}
                        className="text-[10px] font-bold uppercase tracking-[.08em] text-[#C9A227] hover:text-[#D4B03A]"
                      >
                        View
                      </Link>
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </AdminTable>

            <div className="mt-4 flex justify-center">
              {query.isFetching && cursor ? (
                <p className="text-sm text-[#555555]">Loading more…</p>
              ) : nextCursor ? (
                <AdminButton type="button" variant="secondary" onClick={loadMore}>
                  Load more
                </AdminButton>
              ) : null}
            </div>
          </>
        ) : null}
      </AdminPanel>
    </div>
  );
}

function OrdersListInner() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') ?? '';
  const number = searchParams.get('number') ?? '';
  const email = searchParams.get('email') ?? '';

  return (
    <OrdersListBody
      key={`${status}|${number}|${email}`}
      status={status}
      number={number}
      email={email}
    />
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton />}>
      <OrdersListInner />
    </Suspense>
  );
}

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';
import { useAccountOrders, type CustomerOrder } from '@/features/account';
import { AccountPanelSkeleton } from '@/components/common/skeleton';
import { formatTaka } from '@/lib/currency';

export default function OrdersPage() {
  const user = useAppSelector(selectAuthUser)!;
  const [cursor, setCursor] = useState<string | undefined>();
  const [priorRows, setPriorRows] = useState<CustomerOrder[]>([]);

  const params = useMemo(
    () => ({
      limit: 20,
      ...(cursor ? { cursor } : {}),
    }),
    [cursor],
  );

  const { data: pageRows, meta, loading, error } = useAccountOrders(user.id, params);
  const rows = cursor ? [...priorRows, ...pageRows] : pageRows;
  const nextCursor = meta.nextCursor;
  const showInitialLoading = loading && !cursor && rows.length === 0;

  function loadMore() {
    if (!nextCursor) return;
    setPriorRows(rows);
    setCursor(nextCursor);
  }

  if (showInitialLoading) {
    return <AccountPanelSkeleton />;
  }

  if (error && rows.length === 0) {
    return (
      <p
        role="alert"
        className="rounded-[4px] border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200"
      >
        Could not load orders. Please refresh and try again.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">Order History</h2>
      {rows.length === 0 ? (
        <div className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5 text-sm text-[#b5b0a8]">
          No orders yet.{' '}
          <Link href="/shop" className="text-[#e3bb78] hover:text-[#eec98a]">
            Start shopping
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {rows.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[#2d2a27] bg-[#111110] p-4 transition-colors hover:border-[#e3bb78]"
                >
                  <div>
                    <p className="font-semibold text-white">#{order.number}</p>
                    <p className="text-[12px] text-[#8b867d]">
                      {new Date(order.createdAt).toLocaleDateString()} · {order.items.length} item
                      {order.items.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#e5c17d]">{formatTaka(order.total)}</p>
                    <p className="text-[11px] capitalize text-[#b5b0a8]">{order.status}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {nextCursor ? (
            <button
              type="button"
              disabled={loading}
              onClick={loadMore}
              className="rounded-[4px] border border-[#37332c] px-4 py-2 text-[10px] font-bold uppercase text-white hover:border-[#e3bb78] disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Load more orders'}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

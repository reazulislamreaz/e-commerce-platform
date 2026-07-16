'use client';

import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';
import { useAccountOrders } from '@/features/account';
import { formatTaka } from '@/lib/currency';

export default function OrdersPage() {
  const user = useAppSelector(selectAuthUser)!;
  const { data: orders, loading } = useAccountOrders(user.id);

  if (loading) {
    return <p className="text-sm text-[#b5b0a8]">Loading orders…</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">Order History</h2>
      {orders.length === 0 ? (
        <div className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5 text-sm text-[#b5b0a8]">
          No orders yet.{' '}
          <Link href="/shop" className="text-[#e3bb78] hover:text-[#eec98a]">
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
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
      )}
    </div>
  );
}

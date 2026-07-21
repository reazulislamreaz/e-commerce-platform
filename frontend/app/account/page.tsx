'use client';

import Link from 'next/link';
import { Package, Heart, MapPin, Bell } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser, selectWishlistCount } from '@/store/selectors';
import { displayName, useAccountOrders, useUnreadNotificationCount } from '@/features/account';
import { formatTaka } from '@/lib/currency';

export default function AccountOverviewPage() {
  const user = useAppSelector(selectAuthUser)!;
  const wishlistCount = useAppSelector(selectWishlistCount);
  const { data: orders } = useAccountOrders(user.id);
  const unreadQuery = useUnreadNotificationCount(user.id);
  const unread = unreadQuery.data ?? 0;
  const recent = orders.slice(0, 3);

  const cards = [
    { label: 'Orders', value: String(orders.length), href: '/account/orders', icon: Package },
    { label: 'Wishlist', value: String(wishlistCount), href: '/wishlist', icon: Heart },
    { label: 'Addresses', value: 'Manage', href: '/account/addresses', icon: MapPin },
    {
      label: 'Notifications',
      value: unread ? `${unread} new` : 'None',
      href: '/account/notifications',
      icon: Bell,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[4px] border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-bold text-[#111111]">Welcome back, {displayName(user)}</h2>
        <p className="mt-1 text-sm text-[#555555]">
          Manage your orders, profile, and saved preferences from one place.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/shop"
            className="rounded-[4px] border border-[#111111] bg-[#111111] px-4 py-2 text-[10px] font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
          >
            Continue Shopping
          </Link>
          <Link
            href="/track-order"
            className="rounded-[4px] border border-[#111111] bg-white px-4 py-2 text-[10px] font-bold uppercase text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
          >
            Track Order
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-[4px] border border-[#E5E7EB] bg-white p-4 transition-colors hover:border-[#C9A227]"
            >
              <Icon className="size-4 text-[#C9A227]" strokeWidth={1.6} />
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#555555]">
                {card.label}
              </p>
              <p className="mt-1 text-xl font-bold text-[#111111]">{card.value}</p>
            </Link>
          );
        })}
      </div>

      <div className="rounded-[4px] border border-[#E5E7EB] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">
            Recent Orders
          </h3>
          <Link href="/account/orders" className="text-[11px] text-[#C9A227] hover:text-[#D4B03A]">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-[#555555]">No orders yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[#E5E7EB]">
            {recent.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="font-semibold text-[#111111] hover:text-[#C9A227]"
                  >
                    #{order.number}
                  </Link>
                  <p className="text-[12px] capitalize text-[#555555]">{order.status}</p>
                </div>
                <p className="font-semibold text-[#C9A227]">{formatTaka(order.total)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

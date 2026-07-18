'use client';

import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';
import {
  accountRepository,
  useAccountNotifications,
} from '@/features/account';

export default function NotificationsPage() {
  const user = useAppSelector(selectAuthUser)!;
  const { data: items, setData, loading } = useAccountNotifications(user.id);

  const markAllRead = async () => {
    const next = items.map((n) => ({ ...n, read: true }));
    setData(next);
    await accountRepository.markAllNotificationsRead?.();
  };

  if (loading) {
    return <p className="text-sm text-[#b5b0a8]">Loading notifications…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">
          Notifications
        </h2>
        <button
          type="button"
          onClick={() => void markAllRead()}
          className="text-[10px] font-semibold uppercase text-[#e3bb78]"
        >
          Mark all read
        </button>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={`rounded-[4px] border p-4 ${
              item.read
                ? 'border-[#2d2a27] bg-[#111110]'
                : 'border-[#e3bb78]/30 bg-[#1a1815]'
            }`}
          >
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-1 text-sm text-[#b5b0a8]">{item.body}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[11px] text-[#8b867d]">
                {new Date(item.createdAt).toLocaleString()}
              </p>
              {item.href && (
                <Link href={item.href} className="text-[11px] text-[#e3bb78]">
                  View
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

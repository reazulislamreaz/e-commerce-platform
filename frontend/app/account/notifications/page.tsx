'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';
import { AccountPanelSkeleton } from '@/components/common/skeleton';
import {
  accountRepository,
  useAccountNotifications,
} from '@/features/account';

export default function NotificationsPage() {
  const user = useAppSelector(selectAuthUser)!;
  const { data: items, setData, loading, error } = useAccountNotifications(user.id);
  const [marking, setMarking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const markAllRead = async () => {
    setMarking(true);
    setActionError(null);
    const next = items.map((n) => ({ ...n, read: true }));
    setData(next);
    try {
      await accountRepository.markAllNotificationsRead();
    } catch {
      setActionError('Could not mark notifications as read.');
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return <AccountPanelSkeleton />;
  }

  if (error) {
    return (
      <p
        role="alert"
        className="rounded-[4px] border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200"
      >
        Could not load notifications. Please refresh and try again.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">
          Notifications
        </h2>
        {items.length > 0 ? (
          <button
            type="button"
            disabled={marking}
            onClick={() => void markAllRead()}
            className="text-[10px] font-semibold uppercase text-[#e3bb78] disabled:opacity-50"
          >
            Mark all read
          </button>
        ) : null}
      </div>

      {actionError ? (
        <p role="alert" className="text-xs text-red-400">
          {actionError}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5 text-sm text-[#b5b0a8]">
          No notifications yet.
        </p>
      ) : (
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
      )}
    </div>
  );
}

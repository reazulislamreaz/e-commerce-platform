'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';
import { AccountPanelSkeleton } from '@/components/common/skeleton';
import {
  useAccountNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  type AccountNotification,
} from '@/features/account';

export default function NotificationsPage() {
  const user = useAppSelector(selectAuthUser)!;
  const [cursor, setCursor] = useState<string | undefined>();
  const [priorRows, setPriorRows] = useState<AccountNotification[]>([]);
  const [readOverrides, setReadOverrides] = useState<Set<string>>(() => new Set());
  const [markAllOverride, setMarkAllOverride] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const notificationsQuery = useAccountNotifications(user.id, {
    limit: 20,
    ...(cursor ? { cursor } : {}),
  });
  const markOne = useMarkNotificationRead(user.id);
  const markAll = useMarkAllNotificationsRead(user.id);

  const pageRows = notificationsQuery.data;
  const merged = cursor ? [...priorRows, ...pageRows] : pageRows;
  const items = merged.map((item) =>
    markAllOverride || readOverrides.has(item.id) ? { ...item, read: true } : item,
  );
  const nextCursor = notificationsQuery.meta.nextCursor;
  const showInitialLoading = notificationsQuery.loading && !cursor && items.length === 0;

  const markAllRead = async () => {
    setActionError(null);
    try {
      await markAll.mutateAsync();
      setMarkAllOverride(true);
      setPriorRows((rows) => rows.map((n) => ({ ...n, read: true })));
    } catch {
      setActionError('Could not mark notifications as read.');
    }
  };

  const markRead = async (item: AccountNotification) => {
    if (item.read || markOne.isPending) return;
    setActionError(null);
    try {
      await markOne.mutateAsync(item.id);
      setReadOverrides((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });
      setPriorRows((rows) =>
        rows.map((row) => (row.id === item.id ? { ...row, read: true } : row)),
      );
    } catch {
      setActionError('Could not mark notification as read.');
    }
  };

  function loadMore() {
    if (!nextCursor) return;
    setPriorRows(cursor ? [...priorRows, ...pageRows] : pageRows);
    setCursor(nextCursor);
  }

  if (showInitialLoading) {
    return <AccountPanelSkeleton />;
  }

  if (notificationsQuery.error && items.length === 0) {
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
            disabled={markAll.isPending}
            onClick={() => void markAllRead()}
            className="text-[10px] font-semibold uppercase text-[#e3bb78] disabled:opacity-50"
          >
            {markAll.isPending ? 'Marking…' : 'Mark all read'}
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
        <>
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className={`rounded-[4px] border p-4 ${
                  item.read ? 'border-[#2d2a27] bg-[#111110]' : 'border-[#e3bb78]/30 bg-[#1a1815]'
                }`}
              >
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-sm text-[#b5b0a8]">{item.body}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-[#8b867d]">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-3">
                    {!item.read ? (
                      <button
                        type="button"
                        disabled={markOne.isPending}
                        onClick={() => void markRead(item)}
                        className="text-[10px] font-semibold uppercase tracking-wide text-[#e3bb78] hover:text-[#eec98a] disabled:opacity-50"
                      >
                        Mark read
                      </button>
                    ) : null}
                    {item.href ? (
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (!item.read) void markRead(item);
                        }}
                        className="text-[11px] text-[#e3bb78] hover:text-[#eec98a]"
                      >
                        View
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex justify-center">
            {notificationsQuery.isFetching && cursor ? (
              <p className="text-sm text-[#b5b0a8]">Loading more…</p>
            ) : nextCursor ? (
              <button
                type="button"
                onClick={loadMore}
                className="rounded-[4px] border border-[#37332c] px-4 py-2 text-[10px] font-bold uppercase tracking-[.08em] text-white hover:border-[#e3bb78]"
              >
                Load more
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLogout } from '@/features/auth/hooks';
import { removeStorage } from '@/lib/storage';

export default function SettingsPage() {
  const logout = useLogout();
  const router = useRouter();
  const [marketing, setMarketing] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);

  return (
    <div className="space-y-4">
      <div className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5">
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">
          Account Settings
        </h2>
        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between gap-3 text-sm text-[#e9e5de]">
            Order update emails
            <input
              type="checkbox"
              checked={orderUpdates}
              onChange={(e) => setOrderUpdates(e.target.checked)}
              className="size-4 accent-[#e5bd79]"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-[#e9e5de]">
            Marketing & promotions
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="size-4 accent-[#e5bd79]"
            />
          </label>
        </div>
      </div>

      <div className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5">
        <h3 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">Danger Zone</h3>
        <p className="mt-2 text-sm text-[#b5b0a8]">
          Clear local shopping preferences stored in this browser (cart, wishlist, and recently
          viewed will reset after refresh).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              removeStorage('cart');
              removeStorage('wishlist');
              removeStorage('recentlyViewed');
              window.location.reload();
            }}
            className="rounded-[4px] border border-[#37332c] px-4 py-2 text-[10px] font-bold uppercase text-white"
          >
            Clear Local Data
          </button>
          <button
            type="button"
            onClick={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}
            className="rounded-[4px] border border-red-900/60 px-4 py-2 text-[10px] font-bold uppercase text-red-300"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

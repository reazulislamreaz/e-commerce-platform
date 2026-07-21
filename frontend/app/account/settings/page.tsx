'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { useLogout } from '@/features/auth/hooks';
import { removeStorage } from '@/lib/storage';
import { getPreferences, updatePreferences } from '@/features/preferences/api';
import { writeStorage } from '@/lib/storage';
import { MARKETING_CONSENT_STORAGE_KEY } from '@/features/analytics/pixel-consent';
import { AccountPanelSkeleton } from '@/components/common/skeleton';

export default function SettingsPage() {
  const logout = useLogout();
  const router = useRouter();
  const [marketing, setMarketing] = useState(false);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getPreferences()
      .then((prefs) => {
        writeStorage(MARKETING_CONSENT_STORAGE_KEY, prefs.emailMarketing);
        setMarketing(prefs.emailMarketing);
        setOrderUpdates(prefs.emailOrderUpdates);
        setInAppEnabled(prefs.inAppEnabled);
      })
      .catch(() => {
        const message = 'Could not load preferences.';
        setError(message);
        toast.error(message, { dedupeKey: 'settings:load-error' });
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = async (next: {
    emailMarketing?: boolean;
    emailOrderUpdates?: boolean;
    inAppEnabled?: boolean;
  }) => {
    setSaving(true);
    setError(null);
    try {
      const prefs = await updatePreferences(next);
      writeStorage(MARKETING_CONSENT_STORAGE_KEY, prefs.emailMarketing);
      setMarketing(prefs.emailMarketing);
      setOrderUpdates(prefs.emailOrderUpdates);
      setInAppEnabled(prefs.inAppEnabled);
      toast.success('Preferences saved.', { dedupeKey: 'settings:saved' });
    } catch {
      const message = 'Could not save preferences.';
      setError(message);
      toast.error(message, { dedupeKey: 'settings:save-error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[4px] border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">
          Account Settings
        </h2>
        {loading ? (
          <AccountPanelSkeleton />
        ) : (
          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between gap-3 text-sm text-[#555555]">
              Order update emails
              <input
                type="checkbox"
                checked={orderUpdates}
                disabled={saving}
                onChange={(e) => {
                  setOrderUpdates(e.target.checked);
                  void persist({ emailOrderUpdates: e.target.checked });
                }}
                className="size-4 accent-[#C9A227]"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-[#555555]">
              Marketing & promotions
              <input
                type="checkbox"
                checked={marketing}
                disabled={saving}
                onChange={(e) => {
                  setMarketing(e.target.checked);
                  void persist({ emailMarketing: e.target.checked });
                }}
                className="size-4 accent-[#C9A227]"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-[#555555]">
              In-app notifications
              <input
                type="checkbox"
                checked={inAppEnabled}
                disabled={saving}
                onChange={(e) => {
                  setInAppEnabled(e.target.checked);
                  void persist({ inAppEnabled: e.target.checked });
                }}
                className="size-4 accent-[#C9A227]"
              />
            </label>
            {error && (
              <p role="alert" className="text-xs text-red-600">
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-[4px] border border-[#E5E7EB] bg-white p-5">
        <h3 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">
          Danger Zone
        </h3>
        <p className="mt-2 text-sm text-[#555555]">
          Clear local shopping preferences stored in this browser (recently viewed will reset after
          refresh). Cart and wishlist sync from your account when signed in.
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
            className="rounded-[4px] border border-[#E5E7EB] px-4 py-2 text-[10px] font-bold uppercase text-[#111111]"
          >
            Clear Local Data
          </button>
          <button
            type="button"
            onClick={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}
            className="rounded-[4px] border border-red-900/60 px-4 py-2 text-[10px] font-bold uppercase text-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

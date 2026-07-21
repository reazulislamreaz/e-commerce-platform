'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { unsubscribeNewsletter } from '@/features/newsletter/api';

function UnsubscribeInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'done' | 'missing'>(() =>
    token ? 'loading' : 'missing',
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void unsubscribeNewsletter(token)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setStatus('done');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main
      id="main-content"
      className="flex flex-1 items-center justify-center bg-[#FAFAFA] px-5 py-20"
    >
      <div className="max-w-md rounded-[4px] border border-[#E5E7EB] bg-white p-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
          Newsletter
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-[#111111]">Unsubscribe</h1>
        {status === 'loading' && (
          <p className="mt-4 text-sm text-[#555555]">Updating your preferences…</p>
        )}
        {status === 'missing' && (
          <p className="mt-4 text-sm text-[#555555]">
            This unsubscribe link is incomplete. Use the link from your email, or contact support.
          </p>
        )}
        {status === 'done' && (
          <p className="mt-4 text-sm text-[#555555]">
            You have been unsubscribed from marketing emails. Transactional order updates are
            unaffected.
          </p>
        )}
        <Link
          href="/"
          className="mt-6 inline-block text-[11px] font-bold uppercase text-[#C9A227] hover:text-[#D4B03A]"
        >
          Back to Elevate
        </Link>
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#555555]">Loading…</p>
        </main>
      }
    >
      <UnsubscribeInner />
    </Suspense>
  );
}

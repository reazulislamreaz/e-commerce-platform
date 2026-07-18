'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { unsubscribeNewsletter } from '@/features/newsletter/api';

function UnsubscribeInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'done' | 'missing'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('missing');
      return;
    }
    void unsubscribeNewsletter(token)
      .catch(() => undefined)
      .finally(() => setStatus('done'));
  }, [token]);

  return (
    <main id="main-content" className="flex flex-1 items-center justify-center bg-black px-5 py-20">
      <div className="max-w-md rounded-[4px] border border-[#2d2a27] bg-[#111110] p-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          Newsletter
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-white">Unsubscribe</h1>
        {status === 'loading' && (
          <p className="mt-4 text-sm text-[#b5b0a8]">Updating your preferences…</p>
        )}
        {status === 'missing' && (
          <p className="mt-4 text-sm text-[#b5b0a8]">
            This unsubscribe link is incomplete. Use the link from your email, or contact support.
          </p>
        )}
        {status === 'done' && (
          <p className="mt-4 text-sm text-[#b5b0a8]">
            You have been unsubscribed from marketing emails. Transactional order updates are
            unaffected.
          </p>
        )}
        <Link
          href="/"
          className="mt-6 inline-block text-[11px] font-bold uppercase text-[#e3bb78] hover:text-[#eec98a]"
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
        <main className="flex flex-1 items-center justify-center bg-black">
          <p className="text-sm text-[#b5b0a8]">Loading…</p>
        </main>
      }
    >
      <UnsubscribeInner />
    </Suspense>
  );
}

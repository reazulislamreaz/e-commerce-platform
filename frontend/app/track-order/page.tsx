'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FormField } from '@/components/common/form-field';
import { useTrackedOrder } from '@/features/account';
import { getUserFacingErrorMessage } from '@/lib/user-facing-error';

function TrackOrderInner() {
  const params = useSearchParams();
  const [number, setNumber] = useState(params.get('number') ?? '');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [lookup, setLookup] = useState<{
    number: string;
    email: string;
  }>();
  const trackQuery = useTrackedOrder(lookup?.number ?? '', lookup?.email ?? '', Boolean(lookup));
  const submitted = Boolean(lookup);
  const loading = trackQuery.isFetching && !trackQuery.data;
  const order = trackQuery.data;
  const error = trackQuery.isError
    ? getUserFacingErrorMessage(
        trackQuery.error,
        "We couldn't find that order. Please check the order number and email used at checkout.",
      )
    : null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      number: number.trim(),
      email: email.trim().toLowerCase(),
    };
    if (lookup?.number === next.number && lookup.email === next.email) {
      void trackQuery.refetch();
      return;
    }
    setLookup(next);
  };

  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto max-w-xl px-5 py-12 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          Customer Service
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Track Order</h1>
        <p className="mt-2 text-sm text-[#b5b0a8]">
          Enter your order number and the email used at checkout.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <FormField
            label="Order number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="e.g. EA12345678"
            required
          />
          <FormField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-5 py-3 text-[11px] font-bold uppercase text-[#18120b] disabled:opacity-50"
          >
            {loading ? 'Tracking…' : 'Track'}
          </button>
        </form>

        {submitted && (
          <div className="mt-8 rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5">
            {error && <p className="text-sm text-[#b5b0a8]">{error}</p>}
            {order && (
              <div>
                <p className="font-semibold text-white">Order #{order.number}</p>
                <p className="mt-1 capitalize text-[#e3bb78]">{order.status}</p>
                {trackQuery.isFetching ? (
                  <p className="mt-1 text-[11px] text-[#8b867d]">Refreshing status…</p>
                ) : (
                  <p className="mt-1 text-[11px] text-[#8b867d]">
                    Active orders refresh automatically.
                  </p>
                )}
                {order.trackingNumber && (
                  <p className="mt-1 text-sm text-[#b5b0a8]">Courier: {order.trackingNumber}</p>
                )}
                <ol className="mt-4 space-y-2">
                  {order.timeline.map((step) => (
                    <li
                      key={step.label}
                      className={`text-sm ${step.done ? 'text-[#e3bb78]' : 'text-[#8b867d]'}`}
                    >
                      {step.done ? '●' : '○'} {step.label}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center bg-black">
          <p className="text-sm text-[#b5b0a8]">Loading…</p>
        </main>
      }
    >
      <TrackOrderInner />
    </Suspense>
  );
}

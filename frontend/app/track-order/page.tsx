'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FormField } from '@/components/common/form-field';
import { useAppSelector } from '@/store/hooks';
import { getOrders } from '@/features/account/storage';

function TrackOrderInner() {
  const params = useSearchParams();
  const user = useAppSelector((s) => s.auth.user);
  const [number, setNumber] = useState(params.get('number') ?? '');
  const [submitted, setSubmitted] = useState(Boolean(params.get('number')));

  const order = useMemo(() => {
    if (!submitted || !user || !number.trim()) return null;
    return getOrders(user.id).find(
      (o) => o.number.toLowerCase() === number.trim().toLowerCase(),
    );
  }, [submitted, user, number]);

  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto max-w-xl px-5 py-12 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          Customer Service
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Track Order</h1>
        <p className="mt-2 text-sm text-[#b5b0a8]">
          Enter your order number to see the latest status.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <FormField
            label="Order number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="e.g. EA12345678"
          />
          <button
            type="submit"
            className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-5 py-3 text-[11px] font-bold uppercase text-[#18120b]"
          >
            Track
          </button>
        </form>

        {submitted && (
          <div className="mt-8 rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5">
            {!user ? (
              <p className="text-sm text-[#b5b0a8]">
                Sign in to track orders linked to your account, or contact support with your order
                number.
              </p>
            ) : order ? (
              <div>
                <p className="font-semibold text-white">Order #{order.number}</p>
                <p className="mt-1 capitalize text-[#e3bb78]">{order.status}</p>
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
            ) : (
              <p className="text-sm text-[#b5b0a8]">
                No order found with that number in your account.
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<main className="flex-1 bg-black py-20 text-center text-[#b5b0a8]">Loading…</main>}>
      <TrackOrderInner />
    </Suspense>
  );
}

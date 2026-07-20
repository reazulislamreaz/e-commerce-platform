'use client';

import { useState, type FormEvent } from 'react';
import { toast, toastFromError } from '@/lib/toast';
import { subscribeNewsletter } from '@/features/newsletter/api';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !consent) {
      const message = 'Please enter your email and confirm marketing consent.';
      setError(message);
      toast.warning(message, { dedupeKey: 'newsletter:consent' });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await subscribeNewsletter(email.trim(), true);
      setDone(true);
      toast.success("You're on the list. Welcome to Elevate.", {
        dedupeKey: 'newsletter:subscribed',
      });
    } catch (err: unknown) {
      const message = toastFromError(err, 'Could not subscribe. Please try again.');
      setError(message);
      toast.error(message, { dedupeKey: 'newsletter:error' });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="mt-5 text-sm font-medium text-[#e3bb78]">
        You&apos;re on the list. Welcome to Elevate.
      </p>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mx-auto mt-5 w-full max-w-md space-y-3">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-0">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="min-w-0 flex-1 rounded-[4px] border border-[#37332c] bg-[#1a1815] px-3.5 py-3 text-sm text-white outline-none placeholder:text-[#8b867d] focus:border-[#e3bb78] focus:ring-2 focus:ring-[#e3bb78]/15 sm:rounded-r-none"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-[#18120b] transition-colors hover:bg-[#eec98a] disabled:opacity-50 sm:rounded-l-none"
        >
          {submitting ? '…' : 'Subscribe'}
        </button>
      </div>
      <label className="flex items-start gap-2 text-left text-xs text-[#b5b0a8]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 accent-[#e5bd79]"
          required
        />
        <span>
          I agree to receive marketing emails from Elevate Apparel. You can unsubscribe at any time.
        </span>
      </label>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}

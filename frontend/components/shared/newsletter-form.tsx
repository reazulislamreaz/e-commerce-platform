'use client';

import { useState, type FormEvent } from 'react';
import { toast, toastFromError } from '@/lib/toast';
import { subscribeNewsletter } from '@/features/newsletter/api';
import { cn } from '@/lib/utils';

export function NewsletterForm({ theme = 'light' }: { theme?: 'dark' | 'light' }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isLight = theme === 'light';

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
      <p className={cn('mt-5 text-sm font-medium', isLight ? 'text-[#111111]' : 'text-[#C9A227]')}>
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
          className={cn(
            'min-w-0 flex-1 rounded-[4px] px-3.5 py-3 text-sm outline-none transition-colors sm:rounded-r-none',
            isLight
              ? 'border border-[#E5E7EB] bg-white text-[#111111] placeholder:text-[#555555] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20'
              : 'border border-[#E5E7EB] bg-white text-[#111111] placeholder:text-[#555555] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/15',
          )}
        />
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            'rounded-[4px] px-5 py-3 text-[11px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50 sm:rounded-l-none',
            isLight
              ? 'border border-[#111111] bg-[#111111] text-white hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]'
              : 'border border-[#111111] bg-[#111111] text-white hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]',
          )}
        >
          {submitting ? '…' : 'Subscribe'}
        </button>
      </div>
      <label
        className={cn(
          'flex items-start gap-2 text-left text-xs',
          isLight ? 'text-[#555555]' : 'text-[#555555]',
        )}
      >
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className={cn('mt-0.5', isLight ? 'accent-[#C9A227]' : 'accent-[#C9A227]')}
          required
        />
        <span>
          I agree to receive marketing emails from Elevate Apparel. You can unsubscribe at any time.
        </span>
      </label>
      {error && <p className={cn('text-xs', isLight ? 'text-red-600' : 'text-red-600')}>{error}</p>}
    </form>
  );
}

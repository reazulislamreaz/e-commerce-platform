'use client';

import { useState, type FormEvent } from 'react';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setDone(true);
  }

  if (done) {
    return (
      <p className="mt-5 text-sm font-medium text-[#e3bb78]">
        You&apos;re on the list. Welcome to Elevate.
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto mt-5 flex w-full max-w-md flex-col gap-2 sm:flex-row sm:gap-0"
    >
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
        className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-[#18120b] transition-colors hover:bg-[#eec98a] sm:rounded-l-none"
      >
        Subscribe
      </button>
    </form>
  );
}

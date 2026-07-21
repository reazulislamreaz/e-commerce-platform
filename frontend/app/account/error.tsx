'use client';

import Link from 'next/link';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main-content"
      className="flex flex-1 flex-col items-center justify-center bg-[#FAFAFA] px-5 py-20 text-center"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">Account</p>
      <h1 className="mt-2 text-2xl font-extrabold text-[#111111]">Account unavailable</h1>
      <p className="mt-3 max-w-md text-sm text-[#555555]">
        We couldn&apos;t load your account right now. Please try again, or return to the shop.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-[4px] border border-[#111111] bg-[#111111] px-5 py-3 text-[11px] font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
        >
          Try Again
        </button>
        <Link
          href="/shop"
          className="rounded-[4px] border border-[#111111] bg-white px-5 py-3 text-[11px] font-bold uppercase text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
        >
          Shop
        </Link>
      </div>
    </main>
  );
}

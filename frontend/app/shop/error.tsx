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
      className="flex flex-1 flex-col items-center justify-center bg-black px-5 py-20 text-center"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">Shop</p>
      <h1 className="mt-2 text-2xl font-extrabold text-white">Catalog unavailable</h1>
      <p className="mt-3 max-w-md text-sm text-[#b5b0a8]">
        We couldn&apos;t load products right now. Please try again, or return home and browse from
        there.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-5 py-3 text-[11px] font-bold uppercase text-[#18120b]"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="rounded-[4px] border border-[#37332c] px-5 py-3 text-[11px] font-bold uppercase text-white"
        >
          Home
        </Link>
      </div>
    </main>
  );
}

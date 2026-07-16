'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Reserved for production error reporting.
  }, [error]);

  return (
    <main
      id="main-content"
      className="flex flex-1 flex-col items-center justify-center bg-black px-5 py-20 text-center"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">Error</p>
      <h1 className="mt-2 text-2xl font-extrabold text-white">Page unavailable</h1>
      <p className="mt-3 max-w-md text-sm text-[#b5b0a8]">
        Something went wrong loading this page.
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
          href="/shop"
          className="rounded-[4px] border border-[#37332c] px-5 py-3 text-[11px] font-bold uppercase text-white"
        >
          Shop
        </Link>
      </div>
    </main>
  );
}

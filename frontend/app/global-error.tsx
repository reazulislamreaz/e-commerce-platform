'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Reserved for production error reporting (e.g. Sentry).
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAFA] px-5 text-center text-[#111111]">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
          Unexpected issue
        </p>
        <h1 className="mt-2 text-2xl font-extrabold">We hit a snag</h1>
        <p className="mt-3 max-w-md text-sm text-[#555555]">
          Something unexpected happened on our side. Please try again. If the problem continues,
          return home or contact support.
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
            href="/"
            className="rounded-[4px] border border-[#111111] bg-white px-5 py-3 text-[11px] font-bold uppercase text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
          >
            Home
          </Link>
        </div>
      </body>
    </html>
  );
}

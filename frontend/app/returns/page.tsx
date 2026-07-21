import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Returns & Exchanges' };

export default function ReturnsPolicyPage() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]">
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
          Customer Service
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#111111]">Returns & Exchanges</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#555555]">
          <p>
            Unworn items with original tags may be returned or exchanged within 7 days of delivery.
          </p>
          <p>Sale items are eligible for exchange only, subject to stock availability.</p>
          <p>
            Start a request from{' '}
            <Link href="/account/returns" className="text-[#C9A227]">
              My Account → Returns
            </Link>{' '}
            or{' '}
            <Link href="/account/exchanges" className="text-[#C9A227]">
              Exchanges
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}

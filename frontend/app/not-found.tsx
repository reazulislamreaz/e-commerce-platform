import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for could not be found.',
};

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex flex-1 flex-col items-center justify-center bg-[#FAFAFA] px-5 py-24 text-center sm:py-32"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
        Error 404
      </p>
      <h1 className="mt-3 text-[clamp(40px,10vw,72px)] font-extrabold leading-none tracking-[-.04em] text-[#111111]">
        Page not found
      </h1>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-[#555555]">
        This page doesn&apos;t exist or may have moved. Head back to the shop and keep browsing.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/shop"
          className="rounded-[4px] border border-[#111111] bg-[#111111] px-6 py-3 text-xs font-bold uppercase tracking-[.08em] text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]"
        >
          Shop now
        </Link>
        <Link
          href="/"
          className="rounded-[4px] border border-[#E5E7EB] px-6 py-3 text-xs font-bold uppercase tracking-[.08em] text-[#555555] transition-colors hover:border-[#C9A227]/60 hover:text-[#111111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}

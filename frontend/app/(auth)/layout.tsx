import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BadgeCheck, Sparkles, Truck } from 'lucide-react';
import { BrandLogo } from '@/components/shared/brand-logo';

function ArtPanel() {
  return (
    <aside aria-hidden className="relative hidden overflow-hidden lg:block">
      <Image
        src="/images/home/hero.webp"
        alt=""
        fill
        priority
        quality={85}
        sizes="(min-width: 1024px) 40vw, 0vw"
        className="object-cover object-[65%_center]"
      />
      <div className="absolute inset-0 bg-linear-to-t from-[#111111] via-[#111111]/55 to-[#111111]/15" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-8 py-5 text-[10px] font-semibold tracking-[.2em] text-white/70">
        <span>EST. 2024</span>
        <span className="text-[#C9A227]">DHAKA — WORLDWIDE</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-8 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[.11em] text-[#C9A227]">
          Discover Your Edge
        </p>
        <p className="mt-1.5 text-[34px] font-extrabold leading-none tracking-[-.04em] text-white">
          ELEVATE <span className="text-[#C9A227]">EVERYDAY</span>
        </p>
        <ul className="mt-4 space-y-1.5 text-xs text-white/80">
          <li className="flex items-center gap-2">
            <Sparkles className="size-3.5 shrink-0 text-[#C9A227]" />
            Member-only drops &amp; offers
          </li>
          <li className="flex items-center gap-2">
            <Truck className="size-3.5 shrink-0 text-[#C9A227]" />
            Faster checkout &amp; order tracking
          </li>
          <li className="flex items-center gap-2">
            <BadgeCheck className="size-3.5 shrink-0 text-[#C9A227]" />
            Easy 7-day returns
          </li>
        </ul>
      </div>
    </aside>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main-content"
      className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#FAFAFA] px-4 py-10 sm:px-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-0 size-96 rounded-full bg-[#C9A227]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 right-0 size-96 rounded-full bg-[#C9A227]/5 blur-3xl"
      />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.08)] lg:min-h-[600px] lg:grid-cols-[1fr_.9fr]">
        <div className="relative flex flex-col px-6 py-7 sm:px-12">
          <div className="flex items-center justify-between text-xs">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-semibold tracking-wide text-[#555555] transition-colors hover:text-[#C9A227]"
            >
              <ArrowLeft className="size-4" />
              BACK
            </Link>
            <Link href="/" aria-label="Elevate Apparel home">
              <BrandLogo on="light" heightClassName="h-6" />
            </Link>
          </div>
          <div className="flex flex-1 flex-col justify-center py-8">{children}</div>
        </div>
        <ArtPanel />
      </div>
    </main>
  );
}

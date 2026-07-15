import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

function ArtPanel() {
  return (
    <aside
      aria-hidden
      className="relative hidden overflow-hidden bg-linear-to-br from-zinc-950 via-ink to-[#2a2113] lg:flex lg:flex-col"
    >
      {/* Layered gold atmosphere */}
      <div className="pointer-events-none absolute -right-24 top-1/4 size-96 rounded-full bg-gold/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 -bottom-24 size-80 rounded-full bg-gold/15 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 -top-20 size-64 rounded-full bg-gold-light/10 blur-3xl" />
      {/* Fine diagonal texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, #d4af37 0, #d4af37 1px, transparent 1px, transparent 16px)',
        }}
      />
      {/* Oversized watermark monogram */}
      <span
        className={
          'font-serif pointer-events-none absolute -bottom-24 -right-10 select-none text-[22rem] font-bold leading-none text-gold/10'
        }
      >
        E
      </span>

      {/* Top meta bar */}
      <div className="relative flex items-center justify-between border-b border-white/10 px-10 py-5 text-xs tracking-[0.2em] text-zinc-400">
        <span>NEW SEASON</span>
        <span className="text-gold">01—04</span>
      </div>

      {/* Statement */}
      <div className="relative flex flex-1 flex-col justify-center px-10">
        <p className={'font-serif max-w-sm text-3xl font-semibold leading-snug text-white'}>
          We craft comfort that carries your confidence.
        </p>
        <div className="mt-6 h-px w-16 bg-gold" />
        <p className="mt-6 max-w-55 self-end text-right text-xs leading-relaxed text-zinc-400">
          Premium fabrics, timeless cuts — designed to elevate the everyday.
        </p>
      </div>

      {/* Bottom meta bar */}
      <div className="relative flex items-center justify-between border-t border-white/10 px-10 py-5 text-xs tracking-[0.2em] text-zinc-400">
        <span>@{new Date().getFullYear()}</span>
        <span className="text-gold">ELEVATEAPPAREL</span>
      </div>
    </aside>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main-content"
      className="flex flex-1 items-center justify-center bg-[#efeeea] px-4 py-10 sm:px-8"
    >
      <div className="grid w-full max-w-6xl overflow-hidden bg-white shadow-xl shadow-zinc-900/5 lg:min-h-168 lg:grid-cols-2">
        <div className="relative flex flex-col px-6 py-8 sm:px-14">
          <div className="flex items-center text-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-zinc-500 transition-colors hover:text-ink"
            >
              <ArrowLeft className="size-4" />
              Back
            </Link>
            <span
              className={
                'font-serif absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-ink'
              }
            >
              elevate<span className="text-gold-dark">.apparel</span>
            </span>
          </div>
          <div className="flex flex-1 items-center py-12">
            <div className="mx-auto w-full max-w-sm">{children}</div>
          </div>
        </div>
        <ArtPanel />
      </div>
    </main>
  );
}

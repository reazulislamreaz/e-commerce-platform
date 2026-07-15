import Link from 'next/link';

function BrandPanel() {
  return (
    <aside
      aria-hidden
      className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between"
    >
      {/* Decorative gold glows and pattern */}
      <div className="pointer-events-none absolute -right-40 -top-40 size-112 rounded-full bg-gold/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -left-24 size-104 rounded-full bg-gold/10 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, #d4af37 0, #d4af37 1px, transparent 1px, transparent 18px)',
        }}
      />
      <div className="relative px-12 pt-14">
        <p className="text-2xl font-bold tracking-tight text-white">
          Elevate<span className="text-gold">Apparel</span>
        </p>
      </div>
      <div className="relative px-12">
        <div className="mb-6 h-px w-16 bg-gold" />
        <h2 className="max-w-md text-4xl font-bold leading-tight tracking-tight text-white">
          Where premium fabric meets timeless style.
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
          Crafted collections for men, women, and kids — designed for comfort, made to last.
        </p>
      </div>
      <div className="relative flex gap-10 px-12 pb-14">
        {[
          ['Premium', 'Quality fabrics'],
          ['Secure', 'Encrypted checkout'],
          ['Fast', 'Nationwide delivery'],
        ].map(([title, detail]) => (
          <div key={title}>
            <p className="text-sm font-semibold text-gold">{title}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{detail}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="grid flex-1 bg-white lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-16 sm:px-8">
        <div className="w-full max-w-md">
          {children}
          <p className="mt-10 text-center text-xs text-zinc-400">
            By continuing you agree to our{' '}
            <Link href="/terms" className="underline hover:text-zinc-600">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-zinc-600">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
      <BrandPanel />
    </main>
  );
}

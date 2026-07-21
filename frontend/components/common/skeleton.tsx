import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-[4px] bg-[#E5E7EB]',
        'before:absolute before:inset-0 before:-translate-x-full before:bg-linear-to-r before:from-transparent before:via-white/70 before:to-transparent before:content-[""]',
        'motion-safe:before:animate-[elevate-shimmer_1.4s_ease-in-out_infinite]',
        className,
      )}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="min-w-0" aria-hidden>
      <Skeleton className="aspect-[.8] w-full rounded-[4px] bg-[#e4e3e1]/20" />
      <Skeleton className="mt-2 h-3 w-[80%]" />
      <Skeleton className="mt-1.5 h-3 w-[40%]" />
      <Skeleton className="mt-2 h-3.5 w-[33%]" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-x-2.5 gap-y-6 min-[480px]:grid-cols-3 lg:grid-cols-4"
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]" aria-busy="true" aria-live="polite">
      <section className="mx-auto max-w-[1400px] px-5 py-6 sm:px-7 lg:py-10">
        <Skeleton className="mb-6 h-3 w-48" />
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <Skeleton className="aspect-[.8] w-full rounded-[4px] bg-[#e4e3e1]/20" />
            <div className="mt-3 flex gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-20 w-16 shrink-0" />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-10 w-[80%]" />
            <Skeleton className="mt-2 h-5 w-28" />
            <Skeleton className="mt-4 h-16 w-full max-w-md" />
            <Skeleton className="mt-4 h-8 w-40" />
            <Skeleton className="mt-2 h-10 w-56" />
            <Skeleton className="mt-6 h-12 w-full max-w-sm" />
            <Skeleton className="h-12 w-full max-w-sm" />
          </div>
        </div>
      </section>
    </main>
  );
}

export function CatalogPageSkeleton() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]" aria-busy="true" aria-live="polite">
      <section className="mx-auto max-w-[1400px] px-3 py-8 sm:px-6 sm:py-10">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
          <aside className="hidden space-y-4 lg:block">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </aside>
          <ProductGridSkeleton count={8} />
        </div>
      </section>
    </main>
  );
}

export function AccountPanelSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-24 w-full rounded-[4px]" />
      <Skeleton className="h-24 w-full rounded-[4px]" />
      <Skeleton className="h-24 w-full rounded-[4px]" />
    </div>
  );
}

export function AdminTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <div className="flex justify-between gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[#E5E7EB] px-4 py-3.5 last:border-b-0"
          >
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuthFormSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Skeleton className="mx-auto h-3 w-40" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="mt-2 h-11 w-full" />
    </div>
  );
}

export function PageShellSkeleton() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]" aria-busy="true" aria-live="polite">
      <section className="mx-auto max-w-[1400px] px-5 py-10 sm:px-7">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-9 w-64 max-w-full" />
        <Skeleton className="mt-6 h-40 w-full rounded-[4px]" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28 w-full rounded-[4px]" />
          <Skeleton className="h-28 w-full rounded-[4px]" />
          <Skeleton className="h-28 w-full rounded-[4px]" />
        </div>
      </section>
    </main>
  );
}

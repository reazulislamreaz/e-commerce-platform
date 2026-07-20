import { Skeleton } from '@/components/common/skeleton';

type HeroVariant = 'asymmetric' | 'full' | 'split' | 'centered';

export function PageHeroSkeleton({ variant = 'asymmetric' }: { variant?: HeroVariant }) {
  if (variant === 'full') {
    return (
      <section
        className="relative min-h-[42vh] overflow-hidden border-b border-[#2d2a27] bg-[#090909] sm:min-h-[48vh]"
        aria-hidden
      >
        <Skeleton className="absolute inset-0 rounded-none bg-[#1a1815]/80" />
        <div className="relative mx-auto flex min-h-[42vh] max-w-[1400px] flex-col justify-end px-5 pb-10 pt-16 sm:min-h-[48vh] sm:px-7 sm:pb-14">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-12 w-[min(100%,420px)] sm:h-16" />
          <Skeleton className="mt-3 h-4 w-[min(100%,320px)]" />
          <div className="mt-6 flex gap-2.5">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'centered') {
    return (
      <section
        className="border-b border-[#2d2a27] bg-[#090909] px-5 py-14 text-center sm:px-7 sm:py-20"
        aria-hidden
      >
        <Skeleton className="mx-auto h-3 w-28" />
        <Skeleton className="mx-auto mt-3 h-12 w-[min(100%,480px)] sm:h-14" />
        <Skeleton className="mx-auto mt-4 h-4 w-[min(100%,360px)]" />
        <Skeleton className="mx-auto mt-6 h-10 w-32" />
      </section>
    );
  }

  if (variant === 'split') {
    return (
      <section className="overflow-hidden border-b border-[#2d2a27] bg-[#090909]" aria-hidden>
        <div className="mx-auto grid max-w-[1400px] lg:grid-cols-2">
          <div className="flex flex-col justify-center px-3 py-12 sm:px-6 sm:py-14 lg:py-16 lg:pr-10">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-12 w-[min(100%,420px)] sm:h-14" />
            <Skeleton className="mt-4 h-4 w-[min(100%,320px)]" />
            <Skeleton className="mt-6 h-10 w-28" />
          </div>
          <Skeleton className="min-h-[280px] rounded-none sm:min-h-[360px] lg:min-h-[420px]" />
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden border-b border-[#2d2a27] bg-[#090909]" aria-hidden>
      <div className="mx-auto grid max-w-[1400px] lg:grid-cols-[1.05fr_.95fr]">
        <div className="flex flex-col justify-center px-3 py-12 sm:px-6 sm:py-14 lg:py-16 lg:pr-10">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-12 w-[min(100%,400px)] sm:h-14" />
          <Skeleton className="mt-4 h-4 w-[min(100%,300px)]" />
          <Skeleton className="mt-6 h-10 w-28" />
        </div>
        <Skeleton className="min-h-[280px] rounded-none sm:min-h-[360px] lg:min-h-[480px]" />
      </div>
    </section>
  );
}

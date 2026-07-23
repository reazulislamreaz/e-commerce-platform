import {
  AccountPanelSkeleton,
  ProductGridSkeleton,
  ProductCardSkeleton,
  Skeleton,
} from '@/components/common/skeleton';
import { CatalogSectionSkeleton } from '@/components/loading/catalog-section-skeleton';
import { PageHeroSkeleton } from '@/components/loading/page-hero-skeleton';

const sectionClass = 'mx-auto max-w-[1400px] px-3 py-8 sm:px-6 sm:py-10';

export function HomePageSkeleton() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]" aria-busy="true" aria-live="polite">
      {/* Hero */}
      <section className="relative h-[52svh] min-h-[280px] max-h-[480px] overflow-hidden border-b border-[#E5E7EB] bg-[#FAFAFA] md:hidden">
        <Skeleton className="absolute inset-0 rounded-none bg-[#e5e7eb]" />
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="size-2 rounded-full bg-[#e5e7eb]" />
          ))}
        </div>
      </section>
      <section className="relative hidden h-[80svh] min-h-[420px] overflow-hidden border-b border-[#E5E7EB] bg-[#FAFAFA] md:block">
        <Skeleton className="absolute inset-y-0 right-0 w-full rounded-none bg-[#e5e7eb] sm:w-[62%]" />
        <div className="relative mx-auto flex h-full max-w-[1400px] items-center px-5 sm:px-[10.2%]">
          <div className="max-w-[390px] space-y-3">
            <Skeleton className="h-3 w-36 bg-[#e5e7eb]" />
            <Skeleton className="h-14 w-[min(100%,340px)] bg-[#e5e7eb] sm:h-16" />
            <Skeleton className="h-4 w-[min(100%,260px)] bg-[#e5e7eb]" />
            <div className="flex gap-2.5 pt-2">
              <Skeleton className="h-10 w-28 bg-[#e5e7eb]" />
              <Skeleton className="h-10 w-32 bg-[#e5e7eb]" />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits strip */}
      <section className="border-b border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-y-4 px-5 py-8 min-[440px]:grid-cols-2 sm:px-7 lg:grid-cols-4 lg:py-10">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 sm:px-4">
              <Skeleton className="size-8 shrink-0 rounded-full bg-[#e5e7eb]" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24 bg-[#e5e7eb]" />
                <Skeleton className="h-2.5 w-32 bg-[#e5e7eb]" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Collection grid */}
      <section className="bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1400px] px-3 py-10 sm:px-6 sm:py-14">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton
                key={i}
                className="aspect-[.9] w-full bg-[#e5e7eb] sm:aspect-[1.05] lg:h-[325px] lg:aspect-auto"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Featured rail */}
      <section className="bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1400px] px-3 py-10 sm:px-6 sm:py-14">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-40 bg-[#e5e7eb]" />
            <Skeleton className="h-3 w-20 bg-[#e5e7eb]" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 min-[480px]:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="min-w-0 rounded-lg border border-[#E5E7EB] bg-white p-2">
                <Skeleton className="aspect-[.8] w-full rounded-[4px] bg-[#e5e7eb]" />
                <Skeleton className="mt-2 h-3 w-[80%] bg-[#e5e7eb]" />
                <Skeleton className="mt-1.5 h-3 w-[40%] bg-[#e5e7eb]" />
                <Skeleton className="mt-2 h-3.5 w-[33%] bg-[#e5e7eb]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sale promo */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1400px] px-3 py-10 sm:px-6 sm:py-14">
          <Skeleton className="min-h-[160px] w-full rounded-lg bg-[#e5e7eb] sm:min-h-[180px]" />
        </div>
      </section>
    </main>
  );
}

export function ShopPageSkeleton() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]" aria-busy="true" aria-live="polite">
      <PageHeroSkeleton variant="asymmetric" />
      <section className={sectionClass}>
        <CatalogSectionSkeleton count={8} />
      </section>
    </main>
  );
}

export function SalePageSkeleton() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]" aria-busy="true" aria-live="polite">
      <PageHeroSkeleton variant="full" />
      <section className="bg-[#C9A227]" aria-hidden>
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-7">
          <Skeleton className="h-3 w-[min(100%,280px)] bg-[#111111]/15" />
          <Skeleton className="h-8 w-24 bg-[#111111]/15" />
        </div>
      </section>
      <section className={sectionClass}>
        <CatalogSectionSkeleton count={8} />
      </section>
    </main>
  );
}

export function NewArrivalsPageSkeleton() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]" aria-busy="true" aria-live="polite">
      <section className="border-b border-[#E5E7EB] bg-white" aria-hidden>
        <div className="mx-auto flex max-w-[1400px] gap-0 overflow-x-auto px-3 sm:px-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className={`flex min-w-[180px] flex-1 items-center gap-3 px-4 py-4 ${i ? 'border-l border-[#E5E7EB]' : ''}`}
            >
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </section>
      <section className={sectionClass}>
        <CatalogSectionSkeleton count={8} />
      </section>
    </main>
  );
}

export function CategoryPageSkeleton() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]" aria-busy="true" aria-live="polite">
      <section className={sectionClass}>
        <CatalogSectionSkeleton count={8} />
      </section>
    </main>
  );
}

export function SearchPageSkeleton() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]" aria-busy="true" aria-live="polite">
      <section className={sectionClass}>
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-2 h-9 w-64 max-w-full" />
        <div className="mt-8">
          <CatalogSectionSkeleton count={8} />
        </div>
      </section>
    </main>
  );
}

export function CartPageSkeleton() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]" aria-busy="true" aria-live="polite">
      <section className="mx-auto max-w-[1400px] px-5 py-8 sm:px-7 sm:py-10">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-2 h-9 w-48" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <ul className="space-y-4">
            {Array.from({ length: 2 }, (_, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-[4px] border border-[#E5E7EB] bg-white p-3 sm:p-4"
              >
                <Skeleton className="h-28 w-24 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[66%]" />
                  <Skeleton className="h-3 w-[33%]" />
                  <Skeleton className="h-4 w-[25%]" />
                  <Skeleton className="mt-2 h-9 w-28" />
                </div>
              </li>
            ))}
          </ul>
          <aside className="h-fit rounded-[4px] border border-[#E5E7EB] bg-white p-5">
            <Skeleton className="h-4 w-32" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-3 h-5 w-full" />
            </div>
            <Skeleton className="mt-5 h-11 w-full" />
          </aside>
        </div>
      </section>
    </main>
  );
}

export function CheckoutPageSkeleton() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]" aria-busy="true" aria-live="polite">
      <section className="mx-auto max-w-[1400px] px-5 py-8 sm:px-7 sm:py-10">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-9 w-72 max-w-full" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4 rounded-[4px] border border-[#E5E7EB] bg-white p-5">
            <Skeleton className="h-4 w-40" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className={`h-11 ${i >= 2 && i <= 4 ? 'sm:col-span-2' : ''}`} />
              ))}
            </div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full" />
          </div>
          <aside className="h-fit space-y-4 rounded-[4px] border border-[#E5E7EB] bg-white p-5">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-16 w-14 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-[80%]" />
                  <Skeleton className="h-3 w-[50%]" />
                </div>
              </div>
            ))}
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-12 w-full" />
          </aside>
        </div>
      </section>
    </main>
  );
}

export function OrderSuccessSkeleton() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]" aria-busy="true" aria-live="polite">
      <section className="mx-auto max-w-3xl px-5 py-10 sm:px-7 sm:py-14">
        <div className="flex flex-col items-center text-center">
          <Skeleton className="size-16 rounded-full" />
          <Skeleton className="mt-5 h-3 w-28" />
          <Skeleton className="mt-3 h-8 w-72 max-w-full" />
          <Skeleton className="mt-3 h-4 w-80 max-w-full" />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-52 w-full rounded-lg" />
          <Skeleton className="h-52 w-full rounded-lg" />
        </div>
        <Skeleton className="mt-4 h-56 w-full rounded-lg" />
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-11 w-36" />
          <Skeleton className="h-11 w-36" />
        </div>
      </section>
    </main>
  );
}

export function WishlistPageSkeleton() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]" aria-busy="true" aria-live="polite">
      <section className="mx-auto max-w-[1400px] px-5 py-8 sm:px-7 sm:py-10">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-9 w-40" />
        <div className="mt-8">
          <ProductGridSkeleton count={8} />
        </div>
      </section>
    </main>
  );
}

export function AccountLayoutSkeleton() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]" aria-busy="true" aria-live="polite">
      <section className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[4px] border border-[#E5E7EB] bg-white p-2">
            <div className="space-y-0.5">
              {Array.from({ length: 10 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-[4px]" />
              ))}
            </div>
          </aside>
          <AccountPanelSkeleton />
        </div>
      </section>
    </main>
  );
}

/** Product rail for homepage Suspense fallbacks. */
export function ProductRailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-5 min-[480px]:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HomeHeroSkeleton() {
  return (
    <>
      <section
        className="relative h-[52svh] min-h-[280px] max-h-[480px] overflow-hidden border-b border-[#E5E7EB] bg-[#FAFAFA] md:hidden"
        aria-hidden
      >
        <Skeleton className="absolute inset-0 rounded-none bg-[#e5e7eb]" />
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="size-2 rounded-full bg-[#e5e7eb]" />
          ))}
        </div>
      </section>
      <section
        className="relative hidden h-[80svh] min-h-[420px] overflow-hidden border-b border-[#E5E7EB] bg-[#FAFAFA] md:block"
        aria-hidden
      >
        <Skeleton className="absolute inset-y-0 right-0 w-full rounded-none bg-[#e5e7eb] sm:w-[62%]" />
        <div className="relative mx-auto flex h-full max-w-[1400px] items-center px-5 sm:px-[10.2%]">
          <div className="max-w-[390px] space-y-3">
            <Skeleton className="h-3 w-36 bg-[#e5e7eb]" />
            <Skeleton className="h-14 w-[min(100%,340px)] bg-[#e5e7eb] sm:h-16" />
            <Skeleton className="h-4 w-[min(100%,260px)] bg-[#e5e7eb]" />
            <div className="flex gap-2.5 pt-2">
              <Skeleton className="h-10 w-28 bg-[#e5e7eb]" />
              <Skeleton className="h-10 w-32 bg-[#e5e7eb]" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function HomeFeaturedSectionSkeleton() {
  return (
    <section className="bg-[#FAFAFA]" aria-hidden>
      <div className="mx-auto max-w-[1400px] px-3 py-10 sm:px-6 sm:py-14">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-40 bg-[#e5e7eb]" />
          <Skeleton className="h-3 w-20 bg-[#e5e7eb]" />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 min-[480px]:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="min-w-0 rounded-lg border border-[#E5E7EB] bg-white p-2">
              <Skeleton className="aspect-[.8] w-full rounded-[4px] bg-[#e5e7eb]" />
              <Skeleton className="mt-2 h-3 w-[80%] bg-[#e5e7eb]" />
              <Skeleton className="mt-1.5 h-3 w-[40%] bg-[#e5e7eb]" />
              <Skeleton className="mt-2 h-3.5 w-[33%] bg-[#e5e7eb]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeNewArrivalsSectionSkeleton() {
  return (
    <section className="bg-white" aria-hidden>
      <div className="mx-auto max-w-[1400px] px-3 py-10 sm:px-6 sm:py-14">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-32 bg-[#e5e7eb]" />
          <Skeleton className="h-3 w-20 bg-[#e5e7eb]" />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 min-[480px]:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="min-w-0 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
              <Skeleton className="aspect-[.8] w-full rounded-[4px] bg-[#e5e7eb]" />
              <Skeleton className="mt-2 h-3 w-[80%] bg-[#e5e7eb]" />
              <Skeleton className="mt-1.5 h-3 w-[40%] bg-[#e5e7eb]" />
              <Skeleton className="mt-2 h-3.5 w-[33%] bg-[#e5e7eb]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeSalePromoSkeleton() {
  return (
    <section className="bg-[#FAFAFA]" aria-hidden>
      <div className="mx-auto max-w-[1400px] px-3 py-10 sm:px-6 sm:py-14">
        <Skeleton className="min-h-[160px] w-full rounded-lg bg-[#e5e7eb] sm:min-h-[180px]" />
      </div>
    </section>
  );
}

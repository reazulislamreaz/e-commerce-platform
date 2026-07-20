import { ProductGridSkeleton, Skeleton } from '@/components/common/skeleton';

/** Matches `ShopCatalog` layout: sidebar filters + toolbar + product grid. */
export function CatalogSectionSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8" aria-busy="true" aria-live="polite">
      <aside className="hidden space-y-5 lg:block">
        <Skeleton className="h-4 w-20" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            {Array.from({ length: 3 }, (_, j) => (
              <Skeleton key={j} className="h-3 w-full max-w-[180px]" />
            ))}
          </div>
        ))}
      </aside>

      <div>
        <div className="mb-5 flex items-end justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20 lg:hidden" />
            <Skeleton className="hidden h-9 w-36 sm:block" />
          </div>
        </div>
        <ProductGridSkeleton count={count} />
      </div>
    </div>
  );
}

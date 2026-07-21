import type { ReactNode } from 'react';
import { ProductCard } from '@/components/shared/product-card';
import type { CatalogProduct } from '@/features/products/types';

export function ProductGrid({
  products,
  emptyMessage = 'No products found.',
}: {
  products: CatalogProduct[];
  emptyMessage?: string;
}) {
  if (products.length === 0) {
    return <p className="py-16 text-center text-sm text-[#555555]">{emptyMessage}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-x-2.5 gap-y-6 min-[480px]:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 4} />
      ))}
    </div>
  );
}

export function CatalogToolbar({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-bold uppercase tracking-tight text-[#111111] sm:text-[17px]">
          {title}
        </h2>
        <p className="mt-0.5 text-[11px] text-[#555555]">
          {count} {count === 1 ? 'piece' : 'pieces'}
        </p>
      </div>
      {children}
    </div>
  );
}

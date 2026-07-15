import Link from 'next/link';
import { formatTaka } from '@/lib/currency';
import type { CatalogProduct } from '@/features/products/types';

export function ProductCard({ product }: { product: CatalogProduct }) {
  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group relative block overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <div className="overflow-hidden">
        <div
          className="relative aspect-[4/5] w-full transition-transform duration-300 group-hover:scale-105"
          style={{
            background: `linear-gradient(160deg, hsl(${product.imageHue} 45% 88%), hsl(${product.imageHue} 40% 72%))`,
          }}
        >
          <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm font-medium text-zinc-700/70">
            {product.category}
          </span>
        </div>
      </div>
      {discount > 0 && (
        <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-white">
          -{discount}%
        </span>
      )}
      <div className="p-3.5">
        <h3 className="line-clamp-2 min-h-10 text-sm text-zinc-800 transition-colors group-hover:text-gold-dark">
          {product.name}
        </h3>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-bold text-zinc-950">{formatTaka(product.price)}</span>
          {product.compareAtPrice && (
            <span className="text-sm text-zinc-400 line-through">
              {formatTaka(product.compareAtPrice)}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}

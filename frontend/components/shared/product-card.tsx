import Link from 'next/link';
import { Heart } from 'lucide-react';
import { formatTaka } from '@/lib/currency';
import type { CatalogProduct } from '@/features/products/types';

export function ProductCard({ product }: { product: CatalogProduct }) {
  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group relative block overflow-hidden rounded-xl border border-edge bg-surface-2 transition-all hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-lg hover:shadow-black/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <div className="overflow-hidden">
        <div
          className="relative aspect-4/5 w-full transition-transform duration-300 group-hover:scale-105"
          style={{
            background: `linear-gradient(160deg, hsl(${product.imageHue} 12% 22%), hsl(${product.imageHue} 16% 12%))`,
          }}
        >
          <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm font-medium text-zinc-400">
            {product.category}
          </span>
        </div>
      </div>
      {discount > 0 && (
        <span className="absolute left-2.5 top-2.5 rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-ink">
          -{discount}%
        </span>
      )}
      <span
        aria-hidden
        className="absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-full bg-black/40 text-zinc-300 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
      >
        <Heart className="size-4" />
      </span>
      <div className="p-3.5">
        <h3 className="line-clamp-2 min-h-10 text-sm text-zinc-200 transition-colors group-hover:text-gold">
          {product.name}
        </h3>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-bold text-white">{formatTaka(product.price)}</span>
          {product.compareAtPrice && (
            <span className="text-sm text-zinc-500 line-through">
              {formatTaka(product.compareAtPrice)}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}

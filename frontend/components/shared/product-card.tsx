'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { formatTaka } from '@/lib/currency';
import type { CatalogProduct } from '@/features/products/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { wishlistToggled } from '@/store/slices/wishlist-slice';

export function ProductCard({ product }: { product: CatalogProduct }) {
  const dispatch = useAppDispatch();
  const wishlisted = useAppSelector((s) => s.wishlist.productIds.includes(product.id));
  const discount =
    product.compareAtPrice && product.onSale
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0;

  return (
    <div className="group min-w-0">
      <div className="relative overflow-hidden rounded-[4px] bg-[#e4e3e1]">
        <Link href={`/product/${product.slug}`}>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              width={400}
              height={500}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="aspect-[.8] h-auto w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div
              className="aspect-[.8] w-full"
              style={{
                background: `linear-gradient(160deg, hsl(${product.imageHue ?? 0} 12% 22%), hsl(${product.imageHue ?? 0} 16% 12%))`,
              }}
            />
          )}
        </Link>
        {discount > 0 && (
          <span className="absolute left-2 top-2 bg-[#e5bd79] px-2 py-0.5 text-[10px] font-bold text-[#18120b]">
            -{discount}%
          </span>
        )}
        {product.isNew && !discount && (
          <span className="absolute left-2 top-2 border border-[#e3bb78] bg-black/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#e3bb78]">
            New
          </span>
        )}
        {product.inStock === false && (
          <span className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Sold Out
          </span>
        )}
        <button
          type="button"
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={(e) => {
            e.preventDefault();
            dispatch(wishlistToggled(product.id));
          }}
          className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 transition-colors hover:bg-white"
        >
          <Heart
            className={`size-[15px] ${wishlisted ? 'fill-[#e3bb78] stroke-[#e3bb78]' : 'stroke-[#111]'}`}
            strokeWidth={1.5}
          />
        </button>
      </div>
      <Link href={`/product/${product.slug}`}>
        <p className="mt-2 truncate text-[11px] font-medium leading-4 text-white">{product.name}</p>
        <p className="text-[11px] leading-4 text-[#d0cbc4]">{product.color}</p>
        <p className="mt-1 flex items-baseline gap-2 text-[13px] font-semibold text-[#e5c17d]">
          {formatTaka(product.price)}
          {product.compareAtPrice && product.onSale && (
            <span className="text-[11px] font-normal text-[#8b867d] line-through">
              {formatTaka(product.compareAtPrice)}
            </span>
          )}
        </p>
      </Link>
    </div>
  );
}

'use client';

import { memo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatTaka } from '@/lib/currency';
import type { CatalogProduct } from '@/features/products/types';
import { usePrefetchProduct } from '@/features/products';
import { WishlistButton } from '@/components/shared/wishlist-button';
import { ProductImage } from '@/components/common/product-image';
import { cn } from '@/lib/utils';

function ProductCardComponent({
  product,
  priority = false,
  theme = 'light',
}: {
  product: CatalogProduct;
  priority?: boolean;
  /** Prefer light storefront theme; dark kept for rare embeds. */
  theme?: 'dark' | 'light';
}) {
  const prefetch = usePrefetchProduct();
  const rootRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';
  const discount =
    product.compareAtPrice && product.onSale
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0;

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          prefetch(product.slug);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px', threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [prefetch, product.slug]);

  const onIntent = () => prefetch(product.slug);

  return (
    <div
      ref={rootRef}
      className={cn(
        'group min-w-0',
        isLight &&
          'rounded-lg border border-[#E5E7EB] bg-white p-2 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]',
      )}
      onPointerEnter={onIntent}
      onFocus={onIntent}
      onTouchStart={onIntent}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-[4px]',
          isLight ? 'bg-[#FAFAFA]' : 'bg-[#e4e3e1]',
        )}
      >
        <Link href={`/product/${product.slug}`} prefetch>
          {product.image ? (
            <ProductImage
              src={product.image}
              alt={product.name}
              width={400}
              height={500}
              priority={priority}
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
          <span
            className={cn(
              'absolute left-2 top-2 px-2 py-0.5 text-[10px] font-bold',
              isLight ? 'bg-[#C9A227] text-[#111111]' : 'bg-[#C9A227] text-[#111111]',
            )}
          >
            -{discount}%
          </span>
        )}
        {product.isNew && !discount && (
          <span
            className={cn(
              'absolute left-2 top-2 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              isLight
                ? 'border-[#C9A227] bg-[#C9A227] text-[#111111]'
                : 'border-[#C9A227] bg-[#111111]/50 text-[#C9A227]',
            )}
          >
            New
          </span>
        )}
        {product.inStock === false && (
          <span className="absolute bottom-2 left-2 bg-[#111111]/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Sold Out
          </span>
        )}
        <WishlistButton
          productId={product.id}
          className={
            isLight
              ? 'border-[#E5E7EB] bg-white/90 text-[#111111] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-[#C9A227]/60 hover:bg-white hover:text-[#C9A227]'
              : undefined
          }
        />
      </div>
      <Link href={`/product/${product.slug}`} prefetch onFocus={onIntent}>
        <p
          className={cn(
            'mt-2 truncate text-[11px] font-medium leading-4',
            isLight ? 'text-[#111111]' : 'text-[#111111]',
          )}
        >
          {product.name}
        </p>
        <p className={cn('text-[11px] leading-4', isLight ? 'text-[#555555]' : 'text-[#555555]')}>
          {product.color}
        </p>
        <p
          className={cn(
            'mt-1 flex items-baseline gap-2 text-[13px] font-semibold',
            isLight ? 'text-[#C9A227]' : 'text-[#C9A227]',
          )}
        >
          {formatTaka(product.price)}
          {product.compareAtPrice && product.onSale && (
            <span
              className={cn(
                'text-[11px] font-normal line-through',
                isLight ? 'text-[#555555]' : 'text-[#555555]',
              )}
            >
              {formatTaka(product.compareAtPrice)}
            </span>
          )}
        </p>
      </Link>
    </div>
  );
}

export const ProductCard = memo(ProductCardComponent);

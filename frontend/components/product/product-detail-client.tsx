'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Star } from 'lucide-react';
import { formatTaka } from '@/lib/currency';
import type { CatalogProduct } from '@/features/products/types';
import { normalizeProduct } from '@/features/products/types';
import { ProductCard } from '@/components/shared/product-card';
import { ProductActionButtons } from '@/components/product/product-action-buttons';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { WishlistButton } from '@/components/shared/wishlist-button';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { itemAdded } from '@/store/slices/cart-slice';
import { productViewed } from '@/store/slices/recently-viewed-slice';
import { getProductById } from '@/features/products';
import {
  buildProductOrderWhatsAppHref,
  buildTelHref,
  getContactConfig,
} from '@/lib/contact-config';

export function ProductDetailClient({
  product,
  related,
}: {
  product: CatalogProduct;
  related: CatalogProduct[];
}) {
  const p = normalizeProduct(product);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const recentIds = useAppSelector((s) => s.recentlyViewed.productIds);

  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState(p.sizes[0] ?? 'M');
  const [color, setColor] = useState(p.color);
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState(false);
  const [addedMsg, setAddedMsg] = useState(false);

  useEffect(() => {
    dispatch(productViewed(p.id));
  }, [dispatch, p.id]);

  const variant = useMemo(
    () => p.variants.find((v) => v.size === size && v.color === color),
    [p.variants, size, color],
  );

  const stock = variant?.stock ?? (p.inStock ? 10 : 0);
  const inStock = stock > 0;

  const discount =
    p.compareAtPrice && p.onSale
      ? Math.round((1 - p.price / p.compareAtPrice) * 100)
      : 0;

  const recentlyViewed = recentIds
    .filter((id) => id !== p.id)
    .map((id) => getProductById(id))
    .filter(Boolean)
    .slice(0, 4) as CatalogProduct[];

  const contact = getContactConfig();
  const whatsappOrderHref = buildProductOrderWhatsAppHref(
    contact.whatsappNumber,
    { name: p.name, slug: p.slug, price: p.price },
    { size, color, quantity: qty },
  );
  const callOrderHref = buildTelHref(contact.phoneNumber);

  const addToBag = () => {
    if (!inStock) return;
    const variantId = variant?.id ?? `${p.id}-${color}-${size}`;
    dispatch(
      itemAdded({
        productId: p.id,
        variantId,
        size,
        color,
        quantity: qty,
      }),
    );
    setAddedMsg(true);
    window.setTimeout(() => setAddedMsg(false), 2000);
  };

  const orderNow = () => {
    if (!inStock) return;
    const variantId = variant?.id ?? `${p.id}-${color}-${size}`;
    dispatch(
      itemAdded({
        productId: p.id,
        variantId,
        size,
        color,
        quantity: qty,
      }),
    );
    router.push('/checkout');
  };

  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto max-w-[1400px] px-5 py-6 sm:px-7 lg:py-10">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Shop', href: '/shop' },
            { label: p.category, href: `/shop` },
            { label: p.name },
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <div
              className="relative overflow-hidden rounded-[4px] bg-[#e4e3e1]"
              onMouseEnter={() => setZoom(true)}
              onMouseLeave={() => setZoom(false)}
            >
              <Image
                src={p.images[activeImage] ?? p.image}
                alt={p.name}
                width={800}
                height={1000}
                priority
                className={`aspect-[.8] h-auto w-full object-cover transition-transform duration-300 ${
                  zoom ? 'scale-110' : 'scale-100'
                }`}
              />
              {discount > 0 && (
                <span className="absolute left-3 top-3 z-10 bg-[#e5bd79] px-2.5 py-1 text-[11px] font-bold text-[#18120b]">
                  -{discount}%
                </span>
              )}
              <WishlistButton
                productId={p.id}
                variant="overlay"
                className="right-3 top-3"
              />
            </div>
            {p.images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {p.images.map((src, index) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-[4px] border ${
                      index === activeImage ? 'border-[#e5bd79]' : 'border-transparent'
                    }`}
                  >
                    <Image
                      src={src}
                      alt={`${p.name} view ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
              {p.brand} · {p.category}
            </p>
            <h1 className="mt-2 text-[clamp(28px,5vw,42px)] font-extrabold tracking-[-.03em] text-white">
              {p.name}
            </h1>

            {p.reviewCount > 0 && (
              <div className="mt-2 flex items-center gap-2 text-sm text-[#b5b0a8]">
                <span className="inline-flex items-center gap-1 text-[#e5c17d]">
                  <Star className="size-3.5 fill-[#e5c17d]" strokeWidth={0} />
                  {p.rating.toFixed(1)}
                </span>
                <span>({p.reviewCount} reviews)</span>
              </div>
            )}

            <p className="mt-4 flex items-baseline gap-3 text-xl font-semibold text-[#e5c17d]">
              {formatTaka(p.price)}
              {p.compareAtPrice && p.onSale && (
                <span className="text-sm font-normal text-[#8b867d] line-through">
                  {formatTaka(p.compareAtPrice)}
                </span>
              )}
            </p>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-[#eee9e1]">{p.description}</p>

            <div className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-[.12em] text-white">
                Color: <span className="font-medium text-[#b5b0a8]">{color}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {p.colors.map((option) => (
                  <button
                    key={option.name}
                    type="button"
                    title={option.name}
                    onClick={() => setColor(option.name)}
                    className={`size-8 rounded-full border-2 ${
                      color === option.name ? 'border-[#e5bd79]' : 'border-[#37332c]'
                    }`}
                    style={{ backgroundColor: option.hex }}
                    aria-label={option.name}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-[.12em] text-white">Size</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {p.sizes.map((option) => {
                  const available =
                    !p.variants.length ||
                    p.variants.some((v) => v.size === option && v.color === color && v.stock > 0);
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={!available}
                      onClick={() => setSize(option)}
                      className={`min-w-11 rounded-[4px] border px-3 py-2 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-30 ${
                        size === option
                          ? 'border-[#e5bd79] bg-[#e5bd79] text-[#18120b]'
                          : 'border-[#37332c] text-white hover:border-[#e3bb78]'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <Link
                href="/size-guide"
                className="mt-2 inline-block text-[11px] text-[#b5b0a8] underline underline-offset-2 hover:text-[#e3bb78]"
              >
                Size guide
              </Link>
            </div>

            <p
              className={`mt-4 text-[12px] font-semibold ${
                inStock ? 'text-[#8fbf8f]' : 'text-red-400'
              }`}
            >
              {inStock ? `In stock (${stock} left)` : 'Out of stock'}
            </p>

            <div className="mt-5 flex items-center gap-3">
              <div className="inline-flex items-center rounded-[4px] border border-[#37332c]">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="p-2.5 text-white hover:text-[#e3bb78]"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="min-w-8 text-center text-sm font-semibold text-white">{qty}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => Math.min(stock || 1, q + 1))}
                  className="p-2.5 text-white hover:text-[#e3bb78]"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>

            <ProductActionButtons
              inStock={inStock}
              addedMsg={addedMsg}
              productName={p.name}
              whatsappOrderHref={whatsappOrderHref}
              callOrderHref={callOrderHref}
              onAddToBag={addToBag}
              onOrderNow={orderNow}
            />

            <Link
              href="/shop"
              className="mt-6 text-[11px] font-semibold uppercase tracking-wide text-[#b5b0a8] hover:text-[#e3bb78]"
            >
              ← Back to shop
            </Link>
          </div>
        </div>

        {p.reviews.length > 0 && (
          <section className="mt-12 border-t border-[#2d2a27] pt-8">
            <h2 className="text-base font-bold uppercase tracking-tight text-white">
              Reviews & Ratings
            </h2>
            <div className="mt-5 space-y-4">
              {p.reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[#e5c17d]">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="size-3 fill-[#e5c17d]" strokeWidth={0} />
                      ))}
                    </span>
                    <h3 className="text-sm font-semibold text-white">{review.title}</h3>
                    {review.verified && (
                      <span className="text-[10px] uppercase tracking-wide text-[#8fbf8f]">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[#b5b0a8]">{review.body}</p>
                  <p className="mt-2 text-[11px] text-[#8b867d]">
                    {review.author} · {review.createdAt}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>

      {related.length > 0 && (
        <section className="mx-auto max-w-[1400px] border-t border-[#2d2a27] px-3 py-8 sm:px-6 sm:py-10">
          <h2 className="mb-5 text-base font-bold uppercase tracking-tight text-white">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 gap-x-2.5 gap-y-6 min-[480px]:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      {recentlyViewed.length > 0 && (
        <section className="mx-auto max-w-[1400px] border-t border-[#2d2a27] px-3 py-8 sm:px-6 sm:py-10">
          <h2 className="mb-5 text-base font-bold uppercase tracking-tight text-white">
            Recently Viewed
          </h2>
          <div className="grid grid-cols-2 gap-x-2.5 gap-y-6 min-[480px]:grid-cols-3 lg:grid-cols-4">
            {recentlyViewed.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

'use client';

import Image from 'next/image';
import { useRef, useState, type Ref } from 'react';
import { WishlistButton } from '@/components/shared/wishlist-button';
import { cn } from '@/lib/utils';

const SWIPE_THRESHOLD_PX = 40;
const TAP_MAX_MOVE_PX = 12;
const ZOOM_SCALE = 2;

interface ProductGalleryProps {
  images: string[];
  imageAlts?: string[];
  productName: string;
  productId: string;
  /** Percentage discount badge; hidden when 0. */
  discount?: number;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  /** Opens the full-screen lightbox (tap on mobile / click on desktop). */
  onOpenLightbox: () => void;
  /** Cursor-follow magnify is only enabled for fine pointers (desktop). */
  zoomEnabled?: boolean;
  /** Attached to the outer wrapper so the PDP can anchor the fly-to-cart start. */
  containerRef?: Ref<HTMLDivElement>;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Fabrilife-style product gallery.
 *
 * Desktop: vertical thumbnail rail + a large stacked main image with a
 * cursor-following magnify (transform-origin tracks the pointer, so the point
 * under the cursor stays put while the image scales — no lens lag/flicker).
 * Images are stacked and cross-faded so switching thumbnails is instant.
 *
 * Mobile: a full-width, swipeable carousel (GPU translate3d track) with
 * pagination dots; a tap (no swipe) opens the lightbox. All slides preload in
 * the track, so swiping never flickers and the aspect ratio reserves space
 * up front (zero CLS).
 */
export function ProductGallery({
  images,
  imageAlts,
  productName,
  productId,
  discount = 0,
  activeIndex,
  onActiveIndexChange,
  onOpenLightbox,
  zoomEnabled = false,
  containerRef,
}: ProductGalleryProps) {
  const [zooming, setZooming] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const touchMoved = useRef(false);

  const count = images.length;
  const hasMany = count > 1;
  const altFor = (index: number) => imageAlts?.[index] ?? `${productName} view ${index + 1}`;

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomEnabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setOrigin({
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    });
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? 0;
    touchDeltaX.current = 0;
    touchMoved.current = false;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    touchDeltaX.current = (event.touches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(touchDeltaX.current) > TAP_MAX_MOVE_PX) touchMoved.current = true;
  };

  const handleTouchEnd = () => {
    const delta = touchDeltaX.current;
    if (delta <= -SWIPE_THRESHOLD_PX) {
      onActiveIndexChange(Math.min(count - 1, activeIndex + 1));
    } else if (delta >= SWIPE_THRESHOLD_PX) {
      onActiveIndexChange(Math.max(0, activeIndex - 1));
    } else if (!touchMoved.current) {
      onOpenLightbox();
    }
    touchDeltaX.current = 0;
    touchMoved.current = false;
  };

  const overlays = (
    <>
      {discount > 0 && (
        <span className="absolute left-3 top-3 z-10 bg-[#C9A227] px-2.5 py-1 text-[11px] font-bold text-[#111111]">
          -{discount}%
        </span>
      )}
      <WishlistButton productId={productId} variant="overlay" />
    </>
  );

  return (
    <div ref={containerRef}>
      {/* Desktop: vertical thumbnails + magnifiable main image */}
      <div className="hidden gap-3 md:flex">
        {hasMany && (
          <div
            className="flex max-h-[560px] flex-col gap-2 overflow-y-auto pr-0.5"
            role="listbox"
            aria-label={`${productName} image thumbnails`}
          >
            {images.map((src, index) => (
              <button
                key={src}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                aria-label={`Show image ${index + 1} of ${count}`}
                onClick={() => onActiveIndexChange(index)}
                onMouseEnter={() => onActiveIndexChange(index)}
                className={cn(
                  'relative aspect-[.8] w-16 shrink-0 overflow-hidden rounded-[4px] border bg-[#e4e3e1] transition-colors',
                  index === activeIndex
                    ? 'border-[#C9A227]'
                    : 'border-[#E5E7EB] hover:border-[#C9A227]',
                )}
              >
                <Image src={src} alt={altFor(index)} fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="relative flex-1">
          <div
            className={cn(
              'relative aspect-[.8] overflow-hidden rounded-[4px] bg-[#e4e3e1]',
              zoomEnabled ? 'cursor-zoom-in' : 'cursor-pointer',
            )}
            onMouseEnter={() => zoomEnabled && setZooming(true)}
            onMouseLeave={() => setZooming(false)}
            onMouseMove={handleMouseMove}
            onClick={onOpenLightbox}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenLightbox();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Enlarge image of ${productName}`}
          >
            {images.map((src, index) => (
              <div
                key={src}
                aria-hidden={index !== activeIndex}
                className="absolute inset-0 transition-[opacity,transform] duration-300 ease-out will-change-transform motion-reduce:transition-none"
                style={{
                  opacity: index === activeIndex ? 1 : 0,
                  transform: index === activeIndex && zooming ? `scale(${ZOOM_SCALE})` : 'scale(1)',
                  transformOrigin: `${origin.x}% ${origin.y}%`,
                }}
              >
                <Image
                  src={src}
                  alt={altFor(index)}
                  fill
                  priority={index === 0}
                  sizes="(min-width: 1024px) 45vw, 50vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
          {overlays}
        </div>
      </div>

      {/* Mobile: full-width swipeable carousel with pagination dots */}
      <div className="md:hidden">
        <div className="relative">
          <div
            className="relative aspect-[.8] touch-pan-y overflow-hidden rounded-[4px] bg-[#e4e3e1]"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            aria-roledescription="carousel"
            aria-label={`${productName} images`}
          >
            <div
              className="flex h-full will-change-transform transition-transform duration-500 ease-out motion-reduce:transition-none"
              style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}
            >
              {images.map((src, index) => (
                <div key={src} className="relative h-full w-full shrink-0">
                  <Image
                    src={src}
                    alt={altFor(index)}
                    fill
                    priority={index === 0}
                    sizes="100vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>

            {hasMany && (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-2">
                {images.map((src, index) => (
                  <button
                    key={src}
                    type="button"
                    aria-label={`Go to image ${index + 1}`}
                    aria-current={index === activeIndex ? 'true' : undefined}
                    onClick={() => onActiveIndexChange(index)}
                    className={cn(
                      'pointer-events-auto size-2 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-colors duration-300',
                      index === activeIndex ? 'bg-[#C9A227]' : 'bg-white/80',
                    )}
                  />
                ))}
              </div>
            )}
          </div>
          {overlays}
        </div>
      </div>
    </div>
  );
}

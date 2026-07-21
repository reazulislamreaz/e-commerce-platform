'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { HeroSlide } from '@/features/marketing/banners';

const AUTOPLAY_MS = 4500;
const SWIPE_THRESHOLD_PX = 48;

type HomeHeroMobileCarouselProps = {
  slides: HeroSlide[];
};

export function HomeHeroMobileCarousel({ slides }: HomeHeroMobileCarouselProps) {
  const slideCount = slides.length;
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const autoplayPaused = useRef(false);
  const resumeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (slideCount <= 1) {
        return;
      }
      setIndex(((nextIndex % slideCount) + slideCount) % slideCount);
    },
    [slideCount],
  );

  const goNext = useCallback(() => {
    goTo(index + 1);
  }, [goTo, index]);

  const goPrev = useCallback(() => {
    goTo(index - 1);
  }, [goTo, index]);

  const pauseAutoplay = useCallback(() => {
    autoplayPaused.current = true;
    if (resumeTimeout.current) {
      clearTimeout(resumeTimeout.current);
    }
    resumeTimeout.current = setTimeout(() => {
      autoplayPaused.current = false;
    }, AUTOPLAY_MS * 2);
  }, []);

  useEffect(() => {
    if (slideCount <= 1) {
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      return;
    }

    const timer = window.setInterval(() => {
      if (autoplayPaused.current) {
        return;
      }
      setIndex((current) => (current + 1) % slideCount);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [slideCount]);

  useEffect(() => {
    return () => {
      if (resumeTimeout.current) {
        clearTimeout(resumeTimeout.current);
      }
    };
  }, []);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? 0;
    touchDeltaX.current = 0;
    pauseAutoplay();
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    touchDeltaX.current = (event.touches[0]?.clientX ?? 0) - touchStartX.current;
  };

  const handleTouchEnd = () => {
    if (touchDeltaX.current <= -SWIPE_THRESHOLD_PX) {
      goNext();
    } else if (touchDeltaX.current >= SWIPE_THRESHOLD_PX) {
      goPrev();
    }
    touchDeltaX.current = 0;
  };

  if (slideCount === 0) {
    return null;
  }

  return (
    <section
      className="relative h-[52svh] min-h-[280px] max-h-[480px] overflow-hidden border-b border-[#E5E7EB] bg-[#FAFAFA] md:hidden"
      aria-roledescription="carousel"
      aria-label="Hero banner images"
    >
      <div
        className="h-full touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full will-change-transform transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {slides.map((slide, slideIndex) => (
            <div key={slide.id} className="relative h-full w-full shrink-0">
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={slideIndex === 0}
                loading={slideIndex === 0 ? 'eager' : 'lazy'}
                quality={85}
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>
          ))}
        </div>
      </div>

      {slideCount > 1 ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-2"
          aria-hidden={false}
        >
          {slides.map((slide, dotIndex) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Go to slide ${dotIndex + 1}`}
              aria-current={dotIndex === index ? 'true' : undefined}
              onClick={() => {
                pauseAutoplay();
                goTo(dotIndex);
              }}
              className={cn(
                'pointer-events-auto size-2 rounded-full transition-colors duration-300',
                dotIndex === index ? 'bg-[#C9A227]' : 'bg-[#E5E7EB]',
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

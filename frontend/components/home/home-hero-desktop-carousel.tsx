'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const AUTOPLAY_MS = 5000;

export type DesktopHeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  image: string;
  imageAlt: string;
};

type HomeHeroDesktopCarouselProps = {
  slides: DesktopHeroSlide[];
};

export function HomeHeroDesktopCarousel({ slides }: HomeHeroDesktopCarouselProps) {
  const [index, setIndex] = useState(0);
  const slideCount = slides.length;

  useEffect(() => {
    if (slideCount <= 1) {
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slideCount);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [slideCount]);

  if (slideCount === 0) {
    return null;
  }

  return (
    <section className="relative hidden h-[80svh] min-h-[420px] overflow-hidden border-b border-[#E5E7EB] bg-[#FAFAFA] lg:block">
      <div
        className="flex h-full will-change-transform transition-transform duration-700 ease-out motion-reduce:transition-none"
        style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
      >
        {slides.map((slide, slideIndex) => (
          <article key={slide.id} className="relative h-full w-full shrink-0">
            <Image
              src={slide.image}
              alt={slide.imageAlt}
              fill
              priority={slideIndex === 0}
              loading={slideIndex === 0 ? 'eager' : 'lazy'}
              quality={90}
              sizes="100vw"
              className="object-cover object-[72%_center] brightness-[1.02] contrast-[1.03] saturate-[1.04]"
            />
            <div className="absolute inset-0 bg-linear-to-r from-[#FAFAFA]/55 from-0% via-[#FAFAFA]/10 via-28% to-transparent to-45%" />

            <div className="relative mx-auto flex h-full max-w-[1400px] items-center px-5 sm:px-[10.2%]">
              <div className="max-w-[430px] rounded-lg border border-[#E5E7EB]/80 bg-[#FAFAFA]/82 px-6 py-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] backdrop-blur-[4px]">
                <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#C9A227]">
                  {slide.eyebrow}
                </p>
                <h1 className="mt-2 text-[clamp(42px,7vw,64px)] font-extrabold leading-[.95] tracking-[-.045em] text-[#111111]">
                  {slide.title}
                </h1>
                <p className="mt-3 max-w-[360px] text-sm font-medium leading-relaxed text-[#555555]">
                  {slide.description}
                </p>
                <Link
                  href={slide.href}
                  className="mt-5 inline-flex border border-[#111111] bg-[#111111] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
                >
                  {slide.ctaLabel}
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {slideCount > 1 ? (
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-3">
          {slides.map((slide, dotIndex) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Go to hero slide ${dotIndex + 1}`}
              aria-current={dotIndex === index ? 'true' : undefined}
              onClick={() => setIndex(dotIndex)}
              className={cn(
                'size-2.5 rounded-full transition-colors',
                dotIndex === index ? 'bg-[#C9A227]' : 'bg-[#E5E7EB]',
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

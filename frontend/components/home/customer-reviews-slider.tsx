'use client';

import { useCallback, useEffect, useState } from 'react';
import { Quote, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const AUTOPLAY_MS = 5500;

export type CustomerReview = {
  id: string;
  quote: string;
  author: string;
  rating: number;
};

export const CUSTOMER_REVIEWS: CustomerReview[] = [
  {
    id: 'review-shakib',
    quote:
      'The quality is outstanding! Super comfortable and a perfect fit. Elevate is my go-to brand now.',
    author: 'Shakib H.',
    rating: 5,
  },
  {
    id: 'review-rahim',
    quote: 'Soft fabric and the cut is exactly what I wanted. Will buy again.',
    author: 'Rahim K.',
    rating: 5,
  },
  {
    id: 'review-ayesha',
    quote: 'Love the cream color. Fits true to size and feels luxurious.',
    author: 'Ayesha R.',
    rating: 5,
  },
  {
    id: 'review-farhan',
    quote: 'Best hoodie I own. Thick fleece without feeling bulky.',
    author: 'Farhan M.',
    rating: 5,
  },
  {
    id: 'review-sabbir',
    quote: 'Great taper and the fabric feels premium. Ideal for travel days.',
    author: 'Sabbir H.',
    rating: 5,
  },
  {
    id: 'review-tanvir',
    quote: 'Logo placement is clean and the fabric quality is excellent.',
    author: 'Tanvir I.',
    rating: 5,
  },
];

type CustomerReviewsSliderProps = {
  reviews?: CustomerReview[];
};

export function CustomerReviewsSlider({ reviews = CUSTOMER_REVIEWS }: CustomerReviewsSliderProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const slideCount = reviews.length;

  const goTo = useCallback(
    (nextIndex: number) => {
      if (slideCount <= 1) {
        return;
      }
      const normalized = ((nextIndex % slideCount) + slideCount) % slideCount;
      setVisible(false);
      window.setTimeout(() => {
        setIndex(normalized);
        setVisible(true);
      }, 220);
    },
    [slideCount],
  );

  useEffect(() => {
    if (slideCount <= 1) {
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-div: reduce)').matches;
    if (reducedMotion) {
      return;
    }

    const timer = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((current) => (current + 1) % slideCount);
        setVisible(true);
      }, 220);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [slideCount]);

  if (slideCount === 0) {
    return null;
  }

  const review = reviews[index];

  return (
    <div
      className="relative flex min-h-[220px] flex-col rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] px-5 py-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.04)] sm:min-h-[210px] sm:px-10 lg:min-h-[200px] lg:px-12 lg:py-8"
      aria-roledescription="carousel"
      aria-label="Customer reviews"
    >
      <h2 className="text-[16px] font-semibold uppercase text-[#111111]">What Our Customers Say</h2>

      <Quote
        className="absolute left-4 top-[58px] size-5 fill-[#C9A227] text-[#C9A227] sm:left-9"
        aria-hidden
      />

      <div
        className={cn(
          'mx-auto mt-4 flex max-w-[340px] flex-1 flex-col justify-center transition-all duration-500 ease-out motion-reduce:transition-none',
          visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
        )}
        aria-live="polite"
      >
        <p className="text-sm leading-relaxed text-[#555555] sm:text-[15px]">
          &ldquo;{review.quote}&rdquo;
        </p>
        <div className="mt-3 flex justify-center gap-1 text-[#C9A227]" aria-hidden>
          {Array.from({ length: review.rating }, (_, i) => (
            <Star key={i} className="size-3.5 fill-current" />
          ))}
        </div>
        <p className="mt-3 text-xs font-semibold text-[#111111]">— {review.author}</p>
      </div>

      {slideCount > 1 ? (
        <div className="mt-5 flex justify-center gap-2">
          {reviews.map((item, dotIndex) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show review ${dotIndex + 1} of ${slideCount}`}
              aria-current={dotIndex === index ? 'true' : undefined}
              onClick={() => goTo(dotIndex)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                dotIndex === index ? 'w-6 bg-[#C9A227]' : 'w-2 bg-[#E5E7EB] hover:bg-[#D4B03A]/60',
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

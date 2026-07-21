'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Star } from 'lucide-react';
import { z } from 'zod';
import { useAccountReviews, useCreateReview } from '@/features/account';
import { getUserFacingErrorMessage } from '@/lib/user-facing-error';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';

const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Select a rating').max(5),
  body: z.string().trim().min(10, 'Use at least 10 characters').max(2000),
});

type ReviewValues = z.infer<typeof reviewSchema>;

function deriveReviewTitle(body: string): string {
  const snippet = body.trim().split(/\s+/).slice(0, 8).join(' ');
  return snippet.length >= 2 ? snippet.slice(0, 120) : 'Customer review';
}

function StarRatingInput({
  value,
  onChange,
  disabled,
  error,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  error?: string;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[#111111]">Your rating</p>
      <div
        className="flex items-center gap-1.5"
        role="radiogroup"
        aria-label="Rating"
        onMouseLeave={() => setHover(0)}
      >
        {Array.from({ length: 5 }, (_, index) => {
          const starValue = index + 1;
          const filled = starValue <= active;
          return (
            <button
              key={starValue}
              type="button"
              role="radio"
              aria-checked={value === starValue}
              disabled={disabled}
              onMouseEnter={() => setHover(starValue)}
              onClick={() => onChange(starValue)}
              className={cn(
                'rounded-[4px] p-0.5 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50',
                filled ? 'text-[#C9A227]' : 'text-[#E5E7EB]',
              )}
            >
              <Star className={cn('size-7', filled && 'fill-current')} strokeWidth={1.5} />
            </button>
          );
        })}
        <span className="ml-2 text-xs font-semibold uppercase tracking-[.08em] text-[#555555]">
          {active > 0 ? `${active} / 5` : 'Tap to rate'}
        </span>
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type ProductWriteReviewProps = {
  productId: string;
  productName: string;
};

export function ProductWriteReview({ productId, productName }: ProductWriteReviewProps) {
  const pathname = usePathname();
  const user = useAppSelector(selectAuthUser);
  const { data: accountReviews, loading: reviewsLoading } = useAccountReviews(user?.id);
  const createReview = useCreateReview(user?.id);

  const existingReview = useMemo(
    () => accountReviews.find((review) => review.productId === productId),
    [accountReviews, productId],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, body: '' },
  });

  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  if (!user) {
    return (
      <article className="rounded-[4px] border border-[#E5E7EB] bg-white p-5 text-center shadow-[0_2px_10px_rgba(0,0,0,0.04)] sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#C9A227]">
          Share your experience
        </p>
        <h3 className="mt-2 text-base font-bold text-[#111111]">Write a Review</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[#555555]">
          Sign in to rate {productName} and help other shoppers choose with confidence.
        </p>
        <Link
          href={loginHref}
          className="mt-5 inline-flex border border-[#111111] bg-[#111111] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
        >
          Sign in to review
        </Link>
      </article>
    );
  }

  if (reviewsLoading) {
    return (
      <article
        className="rounded-[4px] border border-[#E5E7EB] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] sm:p-6"
        aria-busy="true"
      >
        <div className="h-4 w-40 animate-pulse rounded bg-[#E5E7EB]" />
        <div className="mt-4 space-y-3">
          <div className="h-10 w-full animate-pulse rounded bg-[#E5E7EB]" />
          <div className="h-24 w-full animate-pulse rounded bg-[#E5E7EB]" />
        </div>
      </article>
    );
  }

  if (existingReview) {
    return (
      <article className="rounded-[4px] border border-[#E5E7EB] bg-[#FAFAFA] p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#C9A227]">
          Thank you
        </p>
        <h3 className="mt-2 text-base font-bold text-[#111111]">Your review is on file</h3>
        <p className="mt-2 text-sm text-[#555555]">
          You already submitted a review for this product
          {existingReview.status === 'pending' ? ' — it will appear after moderation.' : '.'}
        </p>
        <Link
          href="/account/reviews"
          className="mt-4 inline-flex text-[11px] font-bold uppercase tracking-[.08em] text-[#111111] transition-colors hover:text-[#C9A227]"
        >
          Manage in account →
        </Link>
      </article>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    await createReview.mutateAsync({
      productId,
      rating: values.rating,
      title: deriveReviewTitle(values.body),
      body: values.body,
    });
    reset({ rating: 0, body: '' });
  });

  const errorMessage =
    createReview.error &&
    getUserFacingErrorMessage(
      createReview.error,
      "We couldn't submit your review right now. Please try again in a moment.",
    );

  return (
    <article className="rounded-[4px] border border-[#E5E7EB] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#C9A227]">
        Share your experience
      </p>
      <h3 className="mt-2 text-base font-bold text-[#111111]">Write a Review</h3>
      <p className="mt-1 text-sm text-[#555555]">
        Tell us what you think about{' '}
        <span className="font-medium text-[#111111]">{productName}</span>.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <Controller
          name="rating"
          control={control}
          render={({ field }) => (
            <StarRatingInput
              value={field.value}
              onChange={field.onChange}
              disabled={createReview.isPending}
              error={errors.rating?.message}
            />
          )}
        />

        <div>
          <label
            htmlFor="product-review-body"
            className="mb-1.5 block text-sm font-medium text-[#111111]"
          >
            Your review
          </label>
          <textarea
            id="product-review-body"
            rows={4}
            placeholder="What did you like about the fit, fabric, and quality?"
            disabled={createReview.isPending}
            {...register('body')}
            className="w-full rounded-[4px] border border-[#E5E7EB] bg-white px-3.5 py-3 text-sm text-[#111111] outline-none transition-colors placeholder:text-[#555555] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 disabled:opacity-60"
          />
          {errors.body ? (
            <p className="mt-1.5 text-xs text-red-600" role="alert">
              {errors.body.message}
            </p>
          ) : null}
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-[4px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={createReview.isPending}
          className="border border-[#111111] bg-[#111111] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createReview.isPending ? 'Submitting…' : 'Submit review'}
        </button>
      </form>
    </article>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField } from '@/components/common/form-field';
import { useCreateReview, useUpdateReview, type AccountReview } from '@/features/account';
import { getUserFacingErrorMessage } from '@/lib/user-facing-error';

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(2, 'Use at least 2 characters').max(120),
  body: z.string().trim().min(10, 'Use at least 10 characters').max(2000),
});

type ReviewValues = z.infer<typeof reviewSchema>;

export function ReviewForm({
  userId,
  productId,
  productName,
  review,
  onSaved,
  onCancel,
}: {
  userId: string;
  productId: string;
  productName: string;
  review?: AccountReview;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const createReview = useCreateReview(userId);
  const updateReview = useUpdateReview(userId);
  const mutation = review ? updateReview : createReview;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: review?.rating ?? 5,
      title: review?.title ?? '',
      body: review?.body ?? '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (review) {
      await updateReview.mutateAsync({ id: review.id, ...values });
    } else {
      await createReview.mutateAsync({ productId, ...values });
    }
    onSaved?.();
  });

  const errorMessage =
    mutation.error &&
    getUserFacingErrorMessage(
      mutation.error,
      "We couldn't save your review right now. Please try again in a moment.",
    );

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-[4px] border border-[#E5E7EB] bg-[#FAFAFA] p-4"
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#C9A227]">
          {review ? 'Edit review' : 'Write a review'}
        </p>
        <h4 className="mt-1 font-semibold text-[#111111]">{productName}</h4>
      </div>
      <div>
        <label htmlFor={`rating-${productId}`} className="mb-1.5 block text-sm text-[#111111]">
          Rating
        </label>
        <select
          id={`rating-${productId}`}
          {...register('rating', { valueAsNumber: true })}
          className="w-full rounded-[4px] border border-[#E5E7EB] bg-white px-3.5 py-3 text-sm text-[#111111] outline-none focus:border-[#C9A227]"
        >
          {[5, 4, 3, 2, 1].map((rating) => (
            <option key={rating} value={rating}>
              {rating} star{rating === 1 ? '' : 's'}
            </option>
          ))}
        </select>
      </div>
      <FormField label="Title" error={errors.title?.message} {...register('title')} />
      <div>
        <label htmlFor={`review-body-${productId}`} className="mb-1.5 block text-sm text-[#111111]">
          Review
        </label>
        <textarea
          id={`review-body-${productId}`}
          rows={5}
          {...register('body')}
          className="w-full rounded-[4px] border border-[#E5E7EB] bg-white px-3.5 py-3 text-sm text-[#111111] outline-none focus:border-[#C9A227]"
        />
        {errors.body ? <p className="mt-1.5 text-xs text-red-600">{errors.body.message}</p> : null}
      </div>
      {errorMessage ? (
        <p role="alert" className="text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-[4px] border border-[#111111] bg-[#111111] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[.08em] text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111] disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving…' : review ? 'Save changes' : 'Submit review'}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[4px] border border-[#E5E7EB] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#111111] hover:border-[#C9A227]"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

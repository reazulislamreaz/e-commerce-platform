'use client';

import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField } from '@/components/common/form-field';
import { useCreateReview, useUpdateReview, type AccountReview } from '@/features/account';

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
    (axios.isAxiosError<{ message?: string }>(mutation.error)
      ? (mutation.error.response?.data.message ?? 'Could not save your review.')
      : 'Could not save your review.');

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-[4px] border border-[#37332c] bg-[#0a0a0b] p-4"
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#e0bd7d]">
          {review ? 'Edit review' : 'Write a review'}
        </p>
        <h4 className="mt-1 font-semibold text-white">{productName}</h4>
      </div>
      <div>
        <label htmlFor={`rating-${productId}`} className="mb-1.5 block text-sm text-[#d8d4cd]">
          Rating
        </label>
        <select
          id={`rating-${productId}`}
          {...register('rating', { valueAsNumber: true })}
          className="w-full rounded-[4px] border border-[#37332c] bg-[#1a1815] px-3.5 py-3 text-sm text-white outline-none focus:border-[#e3bb78]"
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
        <label htmlFor={`review-body-${productId}`} className="mb-1.5 block text-sm text-[#d8d4cd]">
          Review
        </label>
        <textarea
          id={`review-body-${productId}`}
          rows={5}
          {...register('body')}
          className="w-full rounded-[4px] border border-[#37332c] bg-[#1a1815] px-3.5 py-3 text-sm text-white outline-none focus:border-[#e3bb78]"
        />
        {errors.body ? <p className="mt-1.5 text-xs text-red-400">{errors.body.message}</p> : null}
      </div>
      {errorMessage ? (
        <p role="alert" className="text-sm text-red-300">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#18120b] hover:bg-[#eec98a] disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving…' : review ? 'Save changes' : 'Submit review'}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[4px] border border-[#37332c] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[.08em] text-white hover:border-[#e3bb78]"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

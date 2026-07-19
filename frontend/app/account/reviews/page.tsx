'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ReviewForm } from '@/components/account/review-form';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';
import { useAccountReviews, useDeleteReview, type AccountReview } from '@/features/account';
import { AccountPanelSkeleton } from '@/components/common/skeleton';

export default function ReviewsPage() {
  const user = useAppSelector(selectAuthUser)!;
  const { data: reviews, loading } = useAccountReviews(user.id);
  const deleteReview = useDeleteReview(user.id);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleDelete = (review: AccountReview) => {
    if (window.confirm(`Delete your review of ${review.productName}?`)) {
      deleteReview.mutate(review.id);
    }
  };

  if (loading) {
    return <AccountPanelSkeleton />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">
        Reviews & Ratings
      </h2>
      {reviews.length === 0 ? (
        <div className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5 text-sm text-[#b5b0a8]">
          You haven&apos;t written any reviews yet. After your order is delivered, you can rate
          products from the order details page.
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-4">
              {editingId === review.id ? (
                <ReviewForm
                  userId={user.id}
                  productId={review.productId}
                  productName={review.productName}
                  review={review}
                  onSaved={() => setEditingId(null)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/product/${review.productSlug}`}
                        className="text-sm font-semibold text-white hover:text-[#e3bb78]"
                      >
                        {review.productName}
                      </Link>
                      <p
                        className="mt-1 text-[#e5c17d]"
                        aria-label={`${review.rating} out of 5 stars`}
                      >
                        {'★'.repeat(review.rating)}
                      </p>
                    </div>
                    <span className="rounded-[4px] border border-[#37332c] px-2 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#e3bb78]">
                      {review.status ?? 'pending'}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[#eee9e1]">{review.title}</h3>
                  <p className="mt-1 text-sm text-[#b5b0a8]">{review.body}</p>
                  <p className="mt-3 text-[11px] text-[#8b867d]">
                    {review.verified ? 'Verified purchase · ' : ''}
                    {new Date(review.publishedAt ?? review.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(review.id)}
                      className="rounded-[4px] border border-[#37332c] px-3 py-2 text-[10px] font-bold uppercase tracking-[.08em] text-white hover:border-[#e3bb78]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(review)}
                      disabled={deleteReview.isPending}
                      className="rounded-[4px] border border-red-900/60 px-3 py-2 text-[10px] font-bold uppercase tracking-[.08em] text-red-200 hover:border-red-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

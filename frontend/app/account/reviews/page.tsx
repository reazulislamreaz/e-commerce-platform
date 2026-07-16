'use client';

import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import { getAccountReviews } from '@/features/account/storage';

export default function ReviewsPage() {
  const user = useAppSelector((s) => s.auth.user)!;
  const reviews = getAccountReviews(user.id);

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
              <Link
                href={`/product/${review.productSlug}`}
                className="text-sm font-semibold text-white hover:text-[#e3bb78]"
              >
                {review.productName}
              </Link>
              <p className="mt-1 text-[#e5c17d]">{'★'.repeat(review.rating)}</p>
              <p className="mt-1 text-sm text-[#b5b0a8]">{review.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

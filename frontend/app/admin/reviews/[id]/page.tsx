'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AdminTableSkeleton } from '@/components/common/skeleton';
import {
  AdminButton,
  AdminError,
  AdminPanel,
  AdminTextarea,
  StatusPill,
} from '@/components/admin/admin-ui';
import {
  mutationErrorMessage,
  adminApi,
  adminKeys,
  useAdminMutation,
  useAdminReview,
} from '@/features/admin';

const REVIEW_INVALIDATE = [adminKeys.reviewsRoot(), adminKeys.reviewRoot()] as const;

export default function AdminReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const reviewQuery = useAdminReview(id);
  const review = reviewQuery.data;

  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const publishMutation = useAdminMutation(
    (args: { id: string; note?: string }) => adminApi.publishReview(args.id, args.note),
    [...REVIEW_INVALIDATE],
  );
  const rejectMutation = useAdminMutation(
    (args: { id: string; note?: string }) => adminApi.rejectReview(args.id, args.note),
    [...REVIEW_INVALIDATE],
  );

  const busy = publishMutation.isPending || rejectMutation.isPending;

  async function runAction(action: 'publish' | 'reject') {
    if (!review) return;
    setActionError(null);
    setSuccess(null);
    const payload = { id: review.id, ...(note.trim() ? { note: note.trim() } : {}) };
    try {
      if (action === 'publish') await publishMutation.mutateAsync(payload);
      else await rejectMutation.mutateAsync(payload);
      setNote('');
      setSuccess(action === 'publish' ? 'Review published.' : 'Review rejected.');
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not update review.'));
    }
  }

  if (reviewQuery.isLoading) {
    return <AdminTableSkeleton />;
  }

  if (reviewQuery.isError || !review) {
    return (
      <div className="space-y-3">
        <AdminError>Review not found or failed to load.</AdminError>
        <Link
          href="/admin/reviews"
          className="inline-block text-[10px] font-bold uppercase tracking-[.08em] text-[#C9A227]"
        >
          Back to reviews
        </Link>
      </div>
    );
  }

  const canModerate = review.status === 'pending';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/reviews?status=PENDING"
          className="text-[10px] font-bold uppercase tracking-[.08em] text-[#C9A227] hover:text-[#D4B03A]"
        >
          ← Reviews
        </Link>
        <StatusPill>{review.status}</StatusPill>
      </div>

      <AdminPanel
        title={review.title}
        description={`${review.productName} · ${new Date(review.createdAt).toLocaleString()}`}
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Rating
            </dt>
            <dd className="mt-1 text-[#C9A227]">{review.rating}/5</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Author
            </dt>
            <dd className="mt-1 text-[#111111]">
              {review.authorName}
              {review.verified ? (
                <span className="ml-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#C9A227]">
                  Verified
                </span>
              ) : null}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Product
            </dt>
            <dd className="mt-1">
              <Link
                href={`/product/${review.productSlug}`}
                className="text-[#C9A227] hover:text-[#D4B03A]"
              >
                {review.productName}
              </Link>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Body
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-[#111111]">{review.body}</dd>
          </div>
        </dl>
      </AdminPanel>

      {canModerate ? (
        <AdminPanel title="Moderation" description="Publish to the storefront or reject.">
          {actionError ? <AdminError>{actionError}</AdminError> : null}
          {success ? (
            <p className="rounded-[4px] border border-[#C9A227]/40 bg-[#FFFFFF] px-3 py-2 text-sm text-[#C9A227]">
              {success}
            </p>
          ) : null}

          <label className="mt-3 block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Note (optional)
            </span>
            <AdminTextarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Internal moderation note"
              disabled={busy}
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <AdminButton type="button" disabled={busy} onClick={() => void runAction('publish')}>
              Publish
            </AdminButton>
            <AdminButton
              type="button"
              variant="danger"
              disabled={busy}
              onClick={() => void runAction('reject')}
            >
              Reject
            </AdminButton>
          </div>
        </AdminPanel>
      ) : null}
    </div>
  );
}

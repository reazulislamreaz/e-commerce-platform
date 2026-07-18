'use client';

import axios from 'axios';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  AdminButton,
  AdminError,
  AdminPanel,
  AdminTextarea,
  StatusPill,
} from '@/components/admin/admin-ui';
import { adminApi, useAdminMutation, useAdminReview } from '@/features/admin';

function mutationErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function AdminReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const reviewQuery = useAdminReview(id);
  const review = reviewQuery.data;

  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const publishMutation = useAdminMutation((args: { id: string; note?: string }) =>
    adminApi.publishReview(args.id, args.note),
  );
  const rejectMutation = useAdminMutation((args: { id: string; note?: string }) =>
    adminApi.rejectReview(args.id, args.note),
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
    return <p className="py-8 text-center text-sm text-[#b5b0a8]">Loading review…</p>;
  }

  if (reviewQuery.isError || !review) {
    return (
      <div className="space-y-3">
        <AdminError>Review not found or failed to load.</AdminError>
        <Link
          href="/admin/reviews"
          className="inline-block text-[10px] font-bold uppercase tracking-[.08em] text-[#e3bb78]"
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
          className="text-[10px] font-bold uppercase tracking-[.08em] text-[#e3bb78] hover:text-[#eec98a]"
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
            <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Rating
            </dt>
            <dd className="mt-1 text-[#e3bb78]">{review.rating}/5</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Author
            </dt>
            <dd className="mt-1 text-white">
              {review.authorName}
              {review.verified ? (
                <span className="ml-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#e3bb78]">
                  Verified
                </span>
              ) : null}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Product
            </dt>
            <dd className="mt-1">
              <Link
                href={`/product/${review.productSlug}`}
                className="text-[#e3bb78] hover:text-[#eec98a]"
              >
                {review.productName}
              </Link>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Body
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-[#e9e5de]">{review.body}</dd>
          </div>
        </dl>
      </AdminPanel>

      {canModerate ? (
        <AdminPanel title="Moderation" description="Publish to the storefront or reject.">
          {actionError ? <AdminError>{actionError}</AdminError> : null}
          {success ? (
            <p className="rounded-[4px] border border-[#e5bd79]/40 bg-[#1a1815] px-3 py-2 text-sm text-[#e3bb78]">
              {success}
            </p>
          ) : null}

          <label className="mt-3 block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
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

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, type FormEvent } from 'react';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminPanel,
  AdminSelect,
  AdminTable,
  AdminTd,
  AdminTh,
  StatusPill,
} from '@/components/admin/admin-ui';
import { useAdminReviews, type AdminReview } from '@/features/admin';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: '', label: 'All statuses' },
] as const;

function ReviewsListBody({ status }: { status: string }) {
  const router = useRouter();
  const [draftStatus, setDraftStatus] = useState(status);
  const [cursor, setCursor] = useState<string | undefined>();
  const [priorRows, setPriorRows] = useState<AdminReview[]>([]);

  const queryParams = useMemo(
    () => ({
      limit: 20,
      ...(status ? { status } : {}),
      ...(cursor ? { cursor } : {}),
    }),
    [status, cursor],
  );

  const query = useAdminReviews(queryParams);
  const pageRows = query.data?.data ?? [];
  const rows = cursor ? [...priorRows, ...pageRows] : pageRows;
  const nextCursor = query.data?.meta.nextCursor ?? null;
  const showInitialLoading = query.isLoading && !cursor && rows.length === 0;

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (draftStatus) params.set('status', draftStatus);
    const qs = params.toString();
    router.push(qs ? `/admin/reviews?${qs}` : '/admin/reviews?status=PENDING');
  }

  function loadMore() {
    if (!query.data?.meta.nextCursor) return;
    setPriorRows(cursor ? [...priorRows, ...pageRows] : pageRows);
    setCursor(query.data.meta.nextCursor);
  }

  return (
    <div className="space-y-5">
      <AdminPanel title="Reviews" description="Moderate product reviews before they go live.">
        <form onSubmit={applyFilters} className="mb-5 flex flex-wrap items-end gap-3">
          <label className="block min-w-[180px] flex-1 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Status
            </span>
            <AdminSelect
              value={draftStatus}
              onChange={(event) => setDraftStatus(event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AdminSelect>
          </label>
          <AdminButton type="submit">Apply</AdminButton>
          <AdminButton
            type="button"
            variant="secondary"
            onClick={() => router.push('/admin/reviews?status=PENDING')}
          >
            Reset
          </AdminButton>
        </form>

        {query.isError ? <AdminError>Could not load reviews.</AdminError> : null}

        {showInitialLoading ? (
          <p className="py-8 text-center text-sm text-[#b5b0a8]">Loading reviews…</p>
        ) : null}

        {!showInitialLoading && !query.isError && rows.length === 0 ? (
          <AdminEmpty>No reviews match this filter.</AdminEmpty>
        ) : null}

        {rows.length > 0 ? (
          <>
            <AdminTable>
              <thead>
                <tr>
                  <AdminTh>Product</AdminTh>
                  <AdminTh>Rating</AdminTh>
                  <AdminTh>Title</AdminTh>
                  <AdminTh>Author</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh>Created</AdminTh>
                  <AdminTh className="text-right">Detail</AdminTh>
                </tr>
              </thead>
              <tbody>
                {rows.map((review) => (
                  <tr key={review.id}>
                    <AdminTd>
                      <span className="font-semibold text-white">{review.productName}</span>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[#e3bb78]">{review.rating}/5</span>
                    </AdminTd>
                    <AdminTd>
                      <span className="line-clamp-1 text-[#e9e5de]">{review.title}</span>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[#b5b0a8]">{review.authorName}</span>
                    </AdminTd>
                    <AdminTd>
                      <StatusPill>{review.status}</StatusPill>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[#b5b0a8]">
                        {new Date(review.createdAt).toLocaleString()}
                      </span>
                    </AdminTd>
                    <AdminTd className="text-right">
                      <Link
                        href={`/admin/reviews/${review.id}`}
                        className="text-[10px] font-bold uppercase tracking-[.08em] text-[#e3bb78] hover:text-[#eec98a]"
                      >
                        View
                      </Link>
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </AdminTable>

            <div className="mt-4 flex justify-center">
              {query.isFetching && cursor ? (
                <p className="text-sm text-[#b5b0a8]">Loading more…</p>
              ) : nextCursor ? (
                <AdminButton type="button" variant="secondary" onClick={loadMore}>
                  Load more
                </AdminButton>
              ) : null}
            </div>
          </>
        ) : null}
      </AdminPanel>
    </div>
  );
}

function ReviewsListInner() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') ?? 'PENDING';
  return <ReviewsListBody key={status || 'all'} status={status} />;
}

export default function AdminReviewsPage() {
  return (
    <Suspense
      fallback={<p className="py-8 text-center text-sm text-[#b5b0a8]">Loading reviews…</p>}
    >
      <ReviewsListInner />
    </Suspense>
  );
}

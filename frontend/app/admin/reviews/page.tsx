'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, type FormEvent } from 'react';
import { AdminTableSkeleton } from '@/components/common/skeleton';
import { AdminPagination, type AdminPageSize } from '@/components/admin/admin-pagination';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminPageHeader,
  AdminPanel,
  AdminSelect,
  AdminTable,
  AdminTd,
  AdminTh,
  StatusPill,
} from '@/components/admin/admin-ui';
import { useAdminReviews } from '@/features/admin';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: '', label: 'All statuses' },
] as const;

function ReviewsListBody({ status }: { status: string }) {
  const router = useRouter();
  const [draftStatus, setDraftStatus] = useState(status);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(20);

  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      ...(status ? { status } : {}),
    }),
    [status, page, pageSize],
  );

  const query = useAdminReviews(queryParams);
  const rows = query.data?.data ?? [];
  const meta = query.data?.meta ?? { page, pageSize, limit: pageSize, total: 0, totalPages: 1 };
  const showInitialLoading = query.isLoading && rows.length === 0;

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (draftStatus) params.set('status', draftStatus);
    const qs = params.toString();
    router.push(qs ? `/admin/reviews?${qs}` : '/admin/reviews?status=PENDING');
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reviews"
        description="Moderate product reviews before they go live."
      />
      <AdminPanel title="Moderation queue" description="Filter reviews by status.">
        <form onSubmit={applyFilters} className="mb-5 flex flex-wrap items-end gap-3">
          <label className="block min-w-[180px] flex-1 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
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

        {showInitialLoading ? <AdminTableSkeleton /> : null}

        {!showInitialLoading && !query.isError && rows.length === 0 ? (
          <AdminEmpty>No reviews match this filter.</AdminEmpty>
        ) : null}

        {rows.length > 0 ? (
          <div
            className={
              query.isFetching && !query.isLoading ? 'opacity-70 transition-opacity' : undefined
            }
          >
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
                      <span className="font-semibold text-[#111111]">{review.productName}</span>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[#C9A227]">{review.rating}/5</span>
                    </AdminTd>
                    <AdminTd>
                      <span className="line-clamp-1 text-[#111111]">{review.title}</span>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[#555555]">{review.authorName}</span>
                    </AdminTd>
                    <AdminTd>
                      <StatusPill>{review.status}</StatusPill>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[#555555]">
                        {new Date(review.createdAt).toLocaleString()}
                      </span>
                    </AdminTd>
                    <AdminTd className="text-right">
                      <Link
                        href={`/admin/reviews/${review.id}`}
                        className="text-[10px] font-bold uppercase tracking-[.08em] text-[#C9A227] hover:text-[#D4B03A]"
                      >
                        View
                      </Link>
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </AdminTable>

            <AdminPagination
              meta={meta}
              entityLabel="reviews"
              isFetching={query.isFetching && !query.isLoading}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
            />
          </div>
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
    <Suspense fallback={<AdminTableSkeleton />}>
      <ReviewsListInner />
    </Suspense>
  );
}

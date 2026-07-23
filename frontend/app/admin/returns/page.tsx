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
import { useAdminReturns } from '@/features/admin';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'COMPLETED', label: 'Completed' },
] as const;

function ReturnsListBody({ status }: { status: string }) {
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

  const query = useAdminReturns(queryParams);
  const rows = query.data?.data ?? [];
  const meta = query.data?.meta ?? { page, pageSize, limit: pageSize, total: 0, totalPages: 1 };
  const showInitialLoading = query.isLoading && rows.length === 0;

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (draftStatus) params.set('status', draftStatus);
    const qs = params.toString();
    router.push(qs ? `/admin/returns?${qs}` : '/admin/returns');
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Returns" description="Moderate return and exchange requests." />
      <AdminPanel title="Return requests" description="Filter the queue by status.">
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
            onClick={() => router.push('/admin/returns')}
          >
            Clear
          </AdminButton>
        </form>

        {query.isError ? <AdminError>Could not load returns.</AdminError> : null}

        {showInitialLoading ? <AdminTableSkeleton /> : null}

        {!showInitialLoading && !query.isError && rows.length === 0 ? (
          <AdminEmpty>No returns match this filter.</AdminEmpty>
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
                  <AdminTh>Order</AdminTh>
                  <AdminTh>Type</AdminTh>
                  <AdminTh>Reason</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh>Created</AdminTh>
                  <AdminTh className="text-right">Detail</AdminTh>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <AdminTd>
                      <span className="font-semibold text-[#111111]">#{item.orderNumber}</span>
                    </AdminTd>
                    <AdminTd>
                      <span className="capitalize text-[#111111]">{item.type}</span>
                    </AdminTd>
                    <AdminTd>
                      <span className="line-clamp-2 text-[#555555]">{item.reason}</span>
                    </AdminTd>
                    <AdminTd>
                      <StatusPill>{item.status}</StatusPill>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[#555555]">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </AdminTd>
                    <AdminTd className="text-right">
                      <Link
                        href={`/admin/returns/${item.id}`}
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
              entityLabel="returns"
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

function ReturnsListInner() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') ?? '';
  return <ReturnsListBody key={status || 'all'} status={status} />;
}

export default function AdminReturnsPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton />}>
      <ReturnsListInner />
    </Suspense>
  );
}

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, type FormEvent } from 'react';
import { AdminTableSkeleton } from '@/components/common/skeleton';
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
import { useAdminReturns, type AdminReturn } from '@/features/admin';

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
  const [cursor, setCursor] = useState<string | undefined>();
  const [priorRows, setPriorRows] = useState<AdminReturn[]>([]);

  const queryParams = useMemo(
    () => ({
      limit: 20,
      ...(status ? { status } : {}),
      ...(cursor ? { cursor } : {}),
    }),
    [status, cursor],
  );

  const query = useAdminReturns(queryParams);
  const pageRows = query.data?.data ?? [];
  const rows = cursor ? [...priorRows, ...pageRows] : pageRows;
  const nextCursor = query.data?.meta.nextCursor ?? null;
  const showInitialLoading = query.isLoading && !cursor && rows.length === 0;

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (draftStatus) params.set('status', draftStatus);
    const qs = params.toString();
    router.push(qs ? `/admin/returns?${qs}` : '/admin/returns');
  }

  function loadMore() {
    if (!query.data?.meta.nextCursor) return;
    setPriorRows(cursor ? [...priorRows, ...pageRows] : pageRows);
    setCursor(query.data.meta.nextCursor);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Returns"
        description="Moderate return and exchange requests."
      />
      <AdminPanel title="Return requests" description="Filter the queue by status.">
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
            onClick={() => router.push('/admin/returns')}
          >
            Clear
          </AdminButton>
        </form>

        {query.isError ? <AdminError>Could not load returns.</AdminError> : null}

        {showInitialLoading ? (
          <AdminTableSkeleton />
        ) : null}

        {!showInitialLoading && !query.isError && rows.length === 0 ? (
          <AdminEmpty>No returns match this filter.</AdminEmpty>
        ) : null}

        {rows.length > 0 ? (
          <>
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
                      <span className="font-semibold text-white">#{item.orderNumber}</span>
                    </AdminTd>
                    <AdminTd>
                      <span className="capitalize text-[#e9e5de]">{item.type}</span>
                    </AdminTd>
                    <AdminTd>
                      <span className="line-clamp-2 text-[#b5b0a8]">{item.reason}</span>
                    </AdminTd>
                    <AdminTd>
                      <StatusPill>{item.status}</StatusPill>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[#b5b0a8]">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </AdminTd>
                    <AdminTd className="text-right">
                      <Link
                        href={`/admin/returns/${item.id}`}
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

function ReturnsListInner() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') ?? '';
  return <ReturnsListBody key={status || 'all'} status={status} />;
}

export default function AdminReturnsPage() {
  return (
    <Suspense
      fallback={<AdminTableSkeleton />}
    >
      <ReturnsListInner />
    </Suspense>
  );
}

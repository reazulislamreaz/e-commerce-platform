'use client';

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
import {
  adminApi,
  adminKeys,
  mutationErrorMessage,
  useAdminMutation,
  useAdminNewsletter,
  type NewsletterStatus,
} from '@/features/admin';

const STATUS_OPTIONS: { value: NewsletterStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'UNSUBSCRIBED', label: 'Unsubscribed' },
];

function isActiveStatus(status: string): boolean {
  return status.toUpperCase() === 'ACTIVE';
}

function NewsletterListBody({ status }: { status: string }) {
  const router = useRouter();
  const [draftStatus, setDraftStatus] = useState(status);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(20);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      ...(status ? { status } : {}),
    }),
    [status, page, pageSize],
  );

  const query = useAdminNewsletter(queryParams);
  const unsubscribeMutation = useAdminMutation(
    (id: string) => adminApi.forceUnsubscribe(id),
    [adminKeys.newsletterRoot()],
  );

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta ?? { page, pageSize, limit: pageSize, total: 0, totalPages: 1 };
  const showInitialLoading = query.isLoading && rows.length === 0;

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (draftStatus) params.set('status', draftStatus);
    const qs = params.toString();
    router.push(qs ? `/admin/newsletter?${qs}` : '/admin/newsletter');
  }

  async function forceUnsubscribe(id: string, email: string) {
    setActionError(null);
    setSuccess(null);
    try {
      await unsubscribeMutation.mutateAsync(id);
      setSuccess(`Unsubscribed ${email}.`);
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not unsubscribe.'));
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Newsletter"
        description="Manage marketing subscriptions and consent."
      />
      <AdminPanel
        title="Subscribers"
        description="Force-unsubscribe removes marketing consent immediately."
      >
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
            onClick={() => router.push('/admin/newsletter')}
          >
            Clear
          </AdminButton>
        </form>

        {query.isError ? <AdminError>Could not load subscriptions.</AdminError> : null}
        {actionError ? <AdminError>{actionError}</AdminError> : null}
        {success ? (
          <p className="mb-3 rounded-[4px] border border-[#C9A227]/40 bg-[#FFFFFF] px-3 py-2 text-sm text-[#C9A227]">
            {success}
          </p>
        ) : null}

        {showInitialLoading ? <AdminTableSkeleton /> : null}

        {!showInitialLoading && !query.isError && rows.length === 0 ? (
          <AdminEmpty>No newsletter subscriptions.</AdminEmpty>
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
                  <AdminTh>Email</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh>Subscribed</AdminTh>
                  <AdminTh>Unsubscribed</AdminTh>
                  <AdminTh className="text-right">Action</AdminTh>
                </tr>
              </thead>
              <tbody>
                {rows.map((sub) => (
                  <tr key={sub.id}>
                    <AdminTd>
                      <span className="font-semibold text-[#111111]">{sub.email}</span>
                    </AdminTd>
                    <AdminTd>
                      <StatusPill>{sub.status}</StatusPill>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[#555555]">
                        {new Date(sub.createdAt).toLocaleString()}
                      </span>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[#555555]">
                        {sub.unsubscribedAt ? new Date(sub.unsubscribedAt).toLocaleString() : '—'}
                      </span>
                    </AdminTd>
                    <AdminTd className="text-right">
                      {isActiveStatus(sub.status) ? (
                        <AdminButton
                          type="button"
                          variant="danger"
                          disabled={unsubscribeMutation.isPending}
                          onClick={() => void forceUnsubscribe(sub.id, sub.email)}
                        >
                          Force unsubscribe
                        </AdminButton>
                      ) : (
                        <span className="text-xs text-[#555555]">—</span>
                      )}
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </AdminTable>

            <AdminPagination
              meta={meta}
              entityLabel="subscribers"
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

function NewsletterListInner() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') ?? '';
  return <NewsletterListBody key={status || 'all'} status={status} />;
}

export default function AdminNewsletterPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton />}>
      <NewsletterListInner />
    </Suspense>
  );
}

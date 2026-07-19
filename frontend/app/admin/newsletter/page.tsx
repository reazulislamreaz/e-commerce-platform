'use client';

import axios from 'axios';
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
import {
  adminApi,
  adminKeys,
  useAdminMutation,
  useAdminNewsletter,
  type NewsletterStatus,
  type NewsletterSubscription,
} from '@/features/admin';

const STATUS_OPTIONS: { value: NewsletterStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'UNSUBSCRIBED', label: 'Unsubscribed' },
];

function mutationErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function isActiveStatus(status: string): boolean {
  return status.toUpperCase() === 'ACTIVE';
}

function NewsletterListBody({ status }: { status: string }) {
  const router = useRouter();
  const [draftStatus, setDraftStatus] = useState(status);
  const [cursor, setCursor] = useState<string | undefined>();
  const [priorRows, setPriorRows] = useState<NewsletterSubscription[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({
      limit: 20,
      ...(status ? { status } : {}),
      ...(cursor ? { cursor } : {}),
    }),
    [status, cursor],
  );

  const query = useAdminNewsletter(queryParams);
  const unsubscribeMutation = useAdminMutation(
    (id: string) => adminApi.forceUnsubscribe(id),
    [adminKeys.newsletterRoot()],
  );

  const pageRows = query.data?.data ?? [];
  const rows = cursor ? [...priorRows, ...pageRows] : pageRows;
  const nextCursor = query.data?.meta.nextCursor ?? null;
  const showInitialLoading = query.isLoading && !cursor && rows.length === 0;

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (draftStatus) params.set('status', draftStatus);
    const qs = params.toString();
    router.push(qs ? `/admin/newsletter?${qs}` : '/admin/newsletter');
  }

  function loadMore() {
    if (!query.data?.meta.nextCursor) return;
    setPriorRows(cursor ? [...priorRows, ...pageRows] : pageRows);
    setCursor(query.data.meta.nextCursor);
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
            onClick={() => router.push('/admin/newsletter')}
          >
            Clear
          </AdminButton>
        </form>

        {query.isError ? <AdminError>Could not load subscriptions.</AdminError> : null}
        {actionError ? <AdminError>{actionError}</AdminError> : null}
        {success ? (
          <p className="mb-3 rounded-[4px] border border-[#e5bd79]/40 bg-[#1a1815] px-3 py-2 text-sm text-[#e3bb78]">
            {success}
          </p>
        ) : null}

        {showInitialLoading ? (
          <AdminTableSkeleton />
        ) : null}

        {!showInitialLoading && !query.isError && rows.length === 0 ? (
          <AdminEmpty>No newsletter subscriptions.</AdminEmpty>
        ) : null}

        {rows.length > 0 ? (
          <>
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
                      <span className="font-semibold text-white">{sub.email}</span>
                    </AdminTd>
                    <AdminTd>
                      <StatusPill>{sub.status}</StatusPill>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[#b5b0a8]">
                        {new Date(sub.createdAt).toLocaleString()}
                      </span>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[#b5b0a8]">
                        {sub.unsubscribedAt
                          ? new Date(sub.unsubscribedAt).toLocaleString()
                          : '—'}
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
                        <span className="text-xs text-[#8b867d]">—</span>
                      )}
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

function NewsletterListInner() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') ?? '';
  return <NewsletterListBody key={status || 'all'} status={status} />;
}

export default function AdminNewsletterPage() {
  return (
    <Suspense
      fallback={
        <AdminTableSkeleton />
      }
    >
      <NewsletterListInner />
    </Suspense>
  );
}

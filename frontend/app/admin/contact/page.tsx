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
  AdminTextarea,
  AdminTh,
  StatusPill,
} from '@/components/admin/admin-ui';
import {
  adminApi,
  adminKeys,
  mutationErrorMessage,
  useAdminContact,
  useAdminMutation,
  type ContactMessage,
  type ContactStatus,
} from '@/features/admin';

const STATUS_OPTIONS: { value: ContactStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'SPAM', label: 'Spam' },
];

const EDIT_STATUSES: ContactStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'];

function normalizeContactStatus(status: string): ContactStatus {
  const upper = status.toUpperCase() as ContactStatus;
  if (EDIT_STATUSES.includes(upper)) return upper;
  return 'NEW';
}

function ContactListBody({ status }: { status: string }) {
  const router = useRouter();
  const [draftStatus, setDraftStatus] = useState(status);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(20);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<ContactStatus>('NEW');
  const [editNotes, setEditNotes] = useState('');
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

  const query = useAdminContact(queryParams);
  const updateMutation = useAdminMutation(
    (args: { id: string; status?: ContactStatus; adminNotes?: string }) =>
      adminApi.updateContactMessage(args.id, {
        ...(args.status ? { status: args.status } : {}),
        ...(args.adminNotes != null ? { adminNotes: args.adminNotes } : {}),
      }),
    [adminKeys.contactRoot()],
  );

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta ?? { page, pageSize, limit: pageSize, total: 0, totalPages: 1 };
  const showInitialLoading = query.isLoading && rows.length === 0;

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (draftStatus) params.set('status', draftStatus);
    const qs = params.toString();
    router.push(qs ? `/admin/contact?${qs}` : '/admin/contact');
  }

  function startEdit(message: ContactMessage) {
    setEditingId(message.id);
    setEditStatus(normalizeContactStatus(message.status));
    setEditNotes(message.adminNotes ?? '');
    setActionError(null);
    setSuccess(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setActionError(null);
    setSuccess(null);
    try {
      await updateMutation.mutateAsync({
        id: editingId,
        status: editStatus,
        adminNotes: editNotes.trim(),
      });
      setSuccess('Contact message updated.');
      setEditingId(null);
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not update message.'));
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Contact" description="Messages from the storefront contact form." />
      <AdminPanel title="Inbox" description="Filter messages by status.">
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
            onClick={() => router.push('/admin/contact')}
          >
            Clear
          </AdminButton>
        </form>

        {query.isError ? <AdminError>Could not load contact messages.</AdminError> : null}
        {actionError ? <AdminError>{actionError}</AdminError> : null}
        {success ? (
          <p className="mb-3 rounded-[4px] border border-[#C9A227]/40 bg-[#FFFFFF] px-3 py-2 text-sm text-[#C9A227]">
            {success}
          </p>
        ) : null}

        {showInitialLoading ? <AdminTableSkeleton /> : null}

        {!showInitialLoading && !query.isError && rows.length === 0 ? (
          <AdminEmpty>No contact messages.</AdminEmpty>
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
                  <AdminTh>From</AdminTh>
                  <AdminTh>Subject</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh>Created</AdminTh>
                  <AdminTh className="text-right">Edit</AdminTh>
                </tr>
              </thead>
              <tbody>
                {rows.map((message) => (
                  <tr key={message.id}>
                    <AdminTd>
                      <span className="font-semibold text-[#111111]">{message.name}</span>
                      <p className="text-xs text-[#555555]">{message.email}</p>
                    </AdminTd>
                    <AdminTd>
                      <span className="line-clamp-2 text-[#111111]">{message.subject}</span>
                      <p className="mt-1 line-clamp-2 text-xs text-[#555555]">{message.body}</p>
                    </AdminTd>
                    <AdminTd>
                      <StatusPill>{message.status}</StatusPill>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-[#555555]">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </AdminTd>
                    <AdminTd className="text-right">
                      <AdminButton
                        type="button"
                        variant="secondary"
                        onClick={() => startEdit(message)}
                      >
                        Update
                      </AdminButton>
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </AdminTable>

            <AdminPagination
              meta={meta}
              entityLabel="messages"
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

      {editingId ? (
        <AdminPanel title="Update message" description="Set status and admin notes.">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
                Status
              </span>
              <AdminSelect
                value={editStatus}
                onChange={(event) => setEditStatus(event.target.value as ContactStatus)}
                disabled={updateMutation.isPending}
              >
                {EDIT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll('_', ' ')}
                  </option>
                ))}
              </AdminSelect>
            </label>
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
                Admin notes
              </span>
              <AdminTextarea
                rows={3}
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
                disabled={updateMutation.isPending}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <AdminButton
                type="button"
                disabled={updateMutation.isPending}
                onClick={() => void saveEdit()}
              >
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </AdminButton>
              <AdminButton
                type="button"
                variant="secondary"
                disabled={updateMutation.isPending}
                onClick={() => setEditingId(null)}
              >
                Cancel
              </AdminButton>
            </div>
          </div>
        </AdminPanel>
      ) : null}
    </div>
  );
}

function ContactListInner() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') ?? '';
  return <ContactListBody key={status || 'all'} status={status} />;
}

export default function AdminContactPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton />}>
      <ContactListInner />
    </Suspense>
  );
}

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Download, MoreHorizontal, Search } from 'lucide-react';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { AdminPagination, type AdminPageSize } from '@/components/admin/admin-pagination';
import { AdminTableSkeleton } from '@/components/common/skeleton';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminInput,
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
  useAdminUsers,
  type AdminUser,
  type AdminUserListParams,
  type BulkUserAction,
  type UserListSort,
  type UserStatus,
} from '@/features/admin';
import { formatTaka } from '@/lib/currency';
import { getUserFacingErrorMessage } from '@/lib/user-facing-error';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';

const USER_INVALIDATE = [adminKeys.usersRoot()] as const;

type DirectoryMode = 'customers' | 'staff';

type ConfirmState =
  | { type: 'single'; action: ConfirmAction; user: AdminUser }
  | { type: 'bulk'; action: BulkUserAction; count: number }
  | null;

type ConfirmAction =
  'suspend' | 'activate' | 'block' | 'unblock' | 'verify' | 'reset' | 'delete' | 'restore';

const SORT_OPTIONS: Array<{ value: UserListSort; label: string }> = [
  { value: 'CREATED_DESC', label: 'Newest registered' },
  { value: 'CREATED_ASC', label: 'Oldest registered' },
  { value: 'NAME_ASC', label: 'Name A–Z' },
  { value: 'NAME_DESC', label: 'Name Z–A' },
  { value: 'LAST_LOGIN_DESC', label: 'Recently active' },
  { value: 'ORDERS_DESC', label: 'Most orders' },
  { value: 'SPENDING_DESC', label: 'Highest spending' },
];

function displayName(user: AdminUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unnamed user';
}

function toCsv(rows: AdminUser[]) {
  const header = [
    'Name',
    'Email',
    'Phone',
    'Role',
    'Status',
    'Verified',
    'Orders',
    'TotalSpending',
    'LastLogin',
    'Registered',
  ];
  const lines = rows.map((user) =>
    [
      displayName(user),
      user.email,
      user.phone,
      user.role,
      user.status,
      user.emailVerified ? 'yes' : 'no',
      String(user.orderCount),
      String(user.totalSpending),
      user.lastLoginAt ?? '',
      user.createdAt,
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(','),
  );
  return [header.join(','), ...lines].join('\n');
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AccountDirectory({ mode }: { mode: DirectoryMode }) {
  const currentUser = useAppSelector(selectAuthUser)!;
  const superAdmin = currentUser.role === 'SUPER_ADMIN';
  const isStaff = mode === 'staff';
  const basePath = isStaff ? '/admin/staff' : '/admin/users';
  const entityLabel = isStaff ? 'staff' : 'users';

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [verified, setVerified] = useState<'all' | 'yes' | 'no'>('all');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [sort, setSort] = useState<UserListSort>('CREATED_DESC');
  const [deletedOnly, setDeletedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(20);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const params: AdminUserListParams = {
    page,
    limit: pageSize,
    role: isStaff ? 'ADMIN' : 'CUSTOMER',
    sort,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(verified === 'yes' ? { verified: true } : {}),
    ...(verified === 'no' ? { verified: false } : {}),
    ...(createdFrom ? { createdFrom } : {}),
    ...(createdTo ? { createdTo } : {}),
    ...(deletedOnly ? { deleted: true } : {}),
  };

  const usersQuery = useAdminUsers(params);
  const rows = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data?.data]);
  const meta = usersQuery.data?.meta ?? {
    page,
    pageSize,
    limit: pageSize,
    total: 0,
    totalPages: 1,
  };

  const statusMutation = useAdminMutation(
    ({ id, status: next }: { id: string; status: UserStatus }) =>
      adminApi.updateUserStatus(id, next),
    [...USER_INVALIDATE],
    { successMessage: 'Account status updated', errorFallback: 'Could not update status' },
  );
  const verifyMutation = useAdminMutation(
    (id: string) => adminApi.verifyUser(id),
    [...USER_INVALIDATE],
    { successMessage: 'User verified', errorFallback: 'Could not verify user' },
  );
  const resetMutation = useAdminMutation(
    (id: string) => adminApi.resetUserPassword(id),
    [...USER_INVALIDATE],
    { successMessage: 'Password reset email sent', errorFallback: 'Could not send reset email' },
  );
  const deleteMutation = useAdminMutation(
    (id: string) => adminApi.deleteUser(id),
    [...USER_INVALIDATE],
    { successMessage: 'Account soft-deleted', errorFallback: 'Could not delete account' },
  );
  const restoreMutation = useAdminMutation(
    (id: string) => adminApi.restoreUser(id),
    [...USER_INVALIDATE],
    { successMessage: 'Account restored', errorFallback: 'Could not restore account' },
  );
  const bulkMutation = useAdminMutation(
    (body: { ids: string[]; action: BulkUserAction }) => adminApi.bulkUsers(body),
    [...USER_INVALIDATE],
    {
      successMessage: (result) => `Updated ${result.processed} account(s)`,
      errorFallback: 'Bulk action failed',
    },
  );

  const pending =
    statusMutation.isPending ||
    verifyMutation.isPending ||
    resetMutation.isPending ||
    deleteMutation.isPending ||
    restoreMutation.isPending ||
    bulkMutation.isPending;

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  function resetPagination() {
    setPage(1);
    setSelected(new Set());
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(rows.map((row) => row.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isProtected(user: AdminUser) {
    return user.id === currentUser.id || user.role === 'SUPER_ADMIN';
  }

  async function runConfirm() {
    if (!confirm) return;
    if (confirm.type === 'bulk') {
      await bulkMutation.mutateAsync({
        ids: [...selected],
        action: confirm.action,
      });
      setSelected(new Set());
      setConfirm(null);
      return;
    }

    const { user, action } = confirm;
    switch (action) {
      case 'suspend':
      case 'block':
        await statusMutation.mutateAsync({ id: user.id, status: 'SUSPENDED' });
        break;
      case 'activate':
      case 'unblock':
        await statusMutation.mutateAsync({ id: user.id, status: 'ACTIVE' });
        break;
      case 'verify':
        await verifyMutation.mutateAsync(user.id);
        break;
      case 'reset':
        await resetMutation.mutateAsync(user.id);
        break;
      case 'delete':
        await deleteMutation.mutateAsync(user.id);
        break;
      case 'restore':
        await restoreMutation.mutateAsync(user.id);
        break;
    }
    setConfirm(null);
    setMenuUserId(null);
  }

  const confirmCopy = (() => {
    if (!confirm) return { title: '', message: '', label: 'Confirm' };
    if (confirm.type === 'bulk') {
      return {
        title: `Bulk ${confirm.action.replaceAll('_', ' ').toLowerCase()}`,
        message: `Apply this action to ${confirm.count} selected ${entityLabel}?`,
        label: 'Confirm',
      };
    }
    const name = displayName(confirm.user);
    const map: Record<ConfirmAction, { title: string; message: string; label: string }> = {
      suspend: {
        title: 'Suspend account',
        message: `Suspend ${name}? All active sessions will be revoked.`,
        label: 'Suspend',
      },
      activate: {
        title: 'Activate account',
        message: `Activate ${name}?`,
        label: 'Activate',
      },
      block: {
        title: 'Block account',
        message: `Block ${name}? This suspends the account and revokes sessions.`,
        label: 'Block',
      },
      unblock: {
        title: 'Unblock account',
        message: `Unblock ${name} and restore active access?`,
        label: 'Unblock',
      },
      verify: {
        title: 'Verify email',
        message: `Mark ${name} as verified${confirm.user.status === 'PENDING_VERIFICATION' ? ' and activate the account' : ''}?`,
        label: 'Verify',
      },
      reset: {
        title: 'Reset password',
        message: `Send a password-reset email to ${confirm.user.email}?`,
        label: 'Send reset',
      },
      delete: {
        title: 'Soft delete account',
        message: `Soft delete ${name}? Contact details are preserved for restore, and all sessions are revoked.`,
        label: 'Soft delete',
      },
      restore: {
        title: 'Restore account',
        message: `Restore ${name} and reactivate access?`,
        label: 'Restore',
      },
    };
    return map[confirm.action];
  })();

  if (isStaff && !superAdmin) {
    return (
      <div className="space-y-4">
        <AdminPageHeader
          title="Staff"
          description="Administrator accounts are managed by Super Admins only."
        />
        <AdminError>Only Super Admins can manage staff accounts.</AdminError>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isStaff ? 'Staff Management' : 'User Management'}
        description={
          isStaff
            ? 'Administrator accounts, access lifecycle, and audit-ready controls.'
            : 'Customer accounts, verification, commerce signals, and lifecycle actions.'
        }
        actions={
          <AdminButton
            variant="secondary"
            disabled={rows.length === 0}
            onClick={() =>
              downloadCsv(
                `${entityLabel}-${new Date().toISOString().slice(0, 10)}.csv`,
                toCsv(rows),
              )
            }
          >
            <Download className="size-3.5" strokeWidth={1.7} />
            Export page
          </AdminButton>
        }
      />

      <AdminPanel
        title={isStaff ? 'Staff directory' : 'User directory'}
        description="Search, filter, sort, and paginate without losing context."
      >
        <form
          className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchInput.trim());
            resetPagination();
          }}
        >
          <AdminInput
            aria-label={`Search ${entityLabel}`}
            placeholder="Name, email, or phone"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <AdminSelect
            aria-label="Status filter"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as UserStatus | '');
              resetPagination();
            }}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING_VERIFICATION">Pending verification</option>
          </AdminSelect>
          <AdminSelect
            aria-label="Verification filter"
            value={verified}
            onChange={(event) => {
              setVerified(event.target.value as 'all' | 'yes' | 'no');
              resetPagination();
            }}
          >
            <option value="all">All verification</option>
            <option value="yes">Verified</option>
            <option value="no">Unverified</option>
          </AdminSelect>
          <AdminSelect
            aria-label="Sort"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as UserListSort);
              resetPagination();
            }}
          >
            {SORT_OPTIONS.filter((option) =>
              isStaff ? !['ORDERS_DESC', 'SPENDING_DESC'].includes(option.value) : true,
            ).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
          <AdminButton type="submit">
            <Search className="size-3.5" strokeWidth={1.7} />
            Search
          </AdminButton>
        </form>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-[#555555]">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[.08em]">
              Registered from
            </span>
            <AdminInput
              type="date"
              value={createdFrom}
              onChange={(event) => {
                setCreatedFrom(event.target.value);
                resetPagination();
              }}
            />
          </label>
          <label className="text-xs text-[#555555]">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[.08em]">
              Registered to
            </span>
            <AdminInput
              type="date"
              value={createdTo}
              onChange={(event) => {
                setCreatedTo(event.target.value);
                resetPagination();
              }}
            />
          </label>
          <label className="flex items-center gap-2 pb-2 text-xs font-medium text-[#555555]">
            <input
              type="checkbox"
              checked={deletedOnly}
              onChange={(event) => {
                setDeletedOnly(event.target.checked);
                resetPagination();
              }}
              className="size-4 rounded border-[#E5E7EB] accent-[#C9A227]"
            />
            Soft-deleted only
          </label>
        </div>

        {selected.size > 0 ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[#E8D9A8] bg-[#FFF8E7] px-3 py-2.5">
            <p className="mr-2 text-xs font-semibold text-[#111111]">{selected.size} selected</p>
            <AdminButton
              variant="secondary"
              disabled={pending || deletedOnly}
              onClick={() => setConfirm({ type: 'bulk', action: 'ACTIVATE', count: selected.size })}
            >
              Activate
            </AdminButton>
            <AdminButton
              variant="secondary"
              disabled={pending || deletedOnly}
              onClick={() => setConfirm({ type: 'bulk', action: 'SUSPEND', count: selected.size })}
            >
              Suspend
            </AdminButton>
            <AdminButton
              variant="secondary"
              disabled={pending || deletedOnly}
              onClick={() => setConfirm({ type: 'bulk', action: 'VERIFY', count: selected.size })}
            >
              Verify
            </AdminButton>
            <AdminButton
              variant="danger"
              disabled={pending || deletedOnly}
              onClick={() =>
                setConfirm({ type: 'bulk', action: 'SOFT_DELETE', count: selected.size })
              }
            >
              Soft delete
            </AdminButton>
            {deletedOnly ? (
              <AdminButton
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  setConfirm({ type: 'bulk', action: 'RESTORE', count: selected.size })
                }
              >
                Restore
              </AdminButton>
            ) : null}
          </div>
        ) : null}

        {usersQuery.isError ? (
          <AdminError>
            {getUserFacingErrorMessage(usersQuery.error, `Could not load ${entityLabel}.`)}
          </AdminError>
        ) : null}
        {usersQuery.isLoading ? <AdminTableSkeleton rows={8} /> : null}
        {!usersQuery.isLoading && rows.length === 0 ? (
          <AdminEmpty>No {entityLabel} match these filters.</AdminEmpty>
        ) : null}

        {rows.length > 0 ? (
          <div className={usersQuery.isFetching ? 'opacity-70 transition-opacity' : undefined}>
            <AdminTable>
              <thead>
                <tr>
                  <AdminTh className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all on page"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="size-4 rounded border-[#E5E7EB] accent-[#C9A227]"
                    />
                  </AdminTh>
                  <AdminTh>Name</AdminTh>
                  <AdminTh>Contact</AdminTh>
                  <AdminTh>Method</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh>Verified</AdminTh>
                  {!isStaff ? <AdminTh>Orders</AdminTh> : <AdminTh>Role</AdminTh>}
                  {!isStaff ? <AdminTh>Spending</AdminTh> : null}
                  <AdminTh>Last login</AdminTh>
                  <AdminTh>Registered</AdminTh>
                  <AdminTh>Actions</AdminTh>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => {
                  const protectedUser = isProtected(user);
                  return (
                    <tr key={user.id}>
                      <AdminTd>
                        <input
                          type="checkbox"
                          aria-label={`Select ${displayName(user)}`}
                          checked={selected.has(user.id)}
                          disabled={protectedUser}
                          onChange={() => toggleOne(user.id)}
                          className="size-4 rounded border-[#E5E7EB] accent-[#C9A227]"
                        />
                      </AdminTd>
                      <AdminTd>
                        <Link
                          href={`${basePath}/${user.id}`}
                          className="font-semibold text-[#111111] hover:text-[#C9A227]"
                        >
                          {displayName(user)}
                        </Link>
                      </AdminTd>
                      <AdminTd>
                        <p className="text-xs text-[#555555]">{user.email}</p>
                        <p className="text-xs text-[#555555]">{user.phone}</p>
                      </AdminTd>
                      <AdminTd>
                        <StatusPill>{user.registrationMethod}</StatusPill>
                      </AdminTd>
                      <AdminTd>
                        <StatusPill>{user.status.replaceAll('_', ' ')}</StatusPill>
                      </AdminTd>
                      <AdminTd>
                        <StatusPill>{user.emailVerified ? 'Verified' : 'Unverified'}</StatusPill>
                      </AdminTd>
                      {!isStaff ? (
                        <AdminTd>{user.orderCount}</AdminTd>
                      ) : (
                        <AdminTd>
                          <StatusPill>{user.role.replaceAll('_', ' ')}</StatusPill>
                        </AdminTd>
                      )}
                      {!isStaff ? (
                        <AdminTd className="font-semibold text-[#C9A227]">
                          {formatTaka(user.totalSpending)}
                        </AdminTd>
                      ) : null}
                      <AdminTd>
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                      </AdminTd>
                      <AdminTd>{new Date(user.createdAt).toLocaleDateString()}</AdminTd>
                      <AdminTd>
                        <div className="relative">
                          <AdminButton
                            variant="secondary"
                            className="!px-2"
                            aria-label={`Actions for ${displayName(user)}`}
                            onClick={() =>
                              setMenuUserId((current) => (current === user.id ? null : user.id))
                            }
                          >
                            <MoreHorizontal className="size-4" strokeWidth={1.7} />
                          </AdminButton>
                          {menuUserId === user.id ? (
                            <div className="absolute right-0 z-20 mt-1 min-w-44 rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
                              <ActionItem href={`${basePath}/${user.id}`}>View details</ActionItem>
                              {!protectedUser && !user.deletedAt ? (
                                <>
                                  <ActionItem
                                    onClick={() =>
                                      setConfirm({ type: 'single', action: 'activate', user })
                                    }
                                  >
                                    Activate
                                  </ActionItem>
                                  <ActionItem
                                    onClick={() =>
                                      setConfirm({ type: 'single', action: 'suspend', user })
                                    }
                                  >
                                    Suspend
                                  </ActionItem>
                                  <ActionItem
                                    onClick={() =>
                                      setConfirm({ type: 'single', action: 'block', user })
                                    }
                                  >
                                    Block
                                  </ActionItem>
                                  <ActionItem
                                    onClick={() =>
                                      setConfirm({ type: 'single', action: 'unblock', user })
                                    }
                                  >
                                    Unblock
                                  </ActionItem>
                                  <ActionItem
                                    onClick={() =>
                                      setConfirm({ type: 'single', action: 'verify', user })
                                    }
                                  >
                                    Verify
                                  </ActionItem>
                                  <ActionItem
                                    onClick={() =>
                                      setConfirm({ type: 'single', action: 'reset', user })
                                    }
                                  >
                                    Reset password
                                  </ActionItem>
                                  <ActionItem
                                    danger
                                    onClick={() =>
                                      setConfirm({ type: 'single', action: 'delete', user })
                                    }
                                  >
                                    Soft delete
                                  </ActionItem>
                                </>
                              ) : null}
                              {!protectedUser && user.deletedAt ? (
                                <ActionItem
                                  onClick={() =>
                                    setConfirm({ type: 'single', action: 'restore', user })
                                  }
                                >
                                  Restore
                                </ActionItem>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </AdminTd>
                    </tr>
                  );
                })}
              </tbody>
            </AdminTable>

            <AdminPagination
              meta={meta}
              entityLabel={entityLabel}
              isFetching={usersQuery.isFetching && !usersQuery.isLoading}
              onPageChange={(next) => {
                setPage(next);
                setSelected(new Set());
                setMenuUserId(null);
              }}
              onPageSizeChange={(next) => {
                setPageSize(next);
                resetPagination();
              }}
            />
          </div>
        ) : null}
      </AdminPanel>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirmCopy.title}
        message={confirmCopy.message}
        confirmLabel={confirmCopy.label}
        loading={pending}
        onClose={() => (pending ? undefined : setConfirm(null))}
        onConfirm={() => void runConfirm()}
      />
    </div>
  );
}

function ActionItem({
  children,
  onClick,
  href,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  const className = `block w-full px-3 py-2 text-left text-xs font-semibold ${
    danger ? 'text-red-700 hover:bg-red-50' : 'text-[#111111] hover:bg-[#FAFAFA]'
  }`;
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
}

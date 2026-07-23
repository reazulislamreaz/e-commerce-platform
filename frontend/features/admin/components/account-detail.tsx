'use client';

import Link from 'next/link';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminInput,
  AdminPanel,
  AdminSelect,
  AdminSkeleton,
  AdminTable,
  AdminTd,
  AdminTh,
  AdminTextarea,
  StatusPill,
} from '@/components/admin/admin-ui';
import {
  adminApi,
  adminKeys,
  useAdminMutation,
  useAdminUser,
  type AdminRole,
  type AdminUserDetail,
  type UserStatus,
} from '@/features/admin';
import { formatTaka } from '@/lib/currency';
import { getUserFacingErrorMessage } from '@/lib/user-facing-error';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';

const editSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().regex(/^(?:\+8801|01)[3-9]\d{8}$/, 'Use a valid Bangladeshi mobile number'),
});

type EditValues = z.infer<typeof editSchema>;
type DetailMode = 'customers' | 'staff';
type ConfirmAction =
  'suspend' | 'activate' | 'block' | 'unblock' | 'verify' | 'reset' | 'delete' | 'restore';

function nameOf(user: Pick<AdminUserDetail, 'firstName' | 'lastName'>) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unnamed user';
}

export function AccountDetail({ id, mode }: { id: string; mode: DetailMode }) {
  const currentUser = useAppSelector(selectAuthUser)!;
  const superAdmin = currentUser.role === 'SUPER_ADMIN';
  const isStaff = mode === 'staff';
  const listHref = isStaff ? '/admin/staff' : '/admin/users';
  const detailQuery = useAdminUser(id);
  const user = detailQuery.data;
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [notes, setNotes] = useState<string | null>(null);

  const statusMutation = useAdminMutation(
    (status: UserStatus) => adminApi.updateUserStatus(id, status),
    [adminKeys.usersRoot(), adminKeys.user(id)],
    { successMessage: 'Status updated', errorFallback: 'Could not update status' },
  );
  const roleMutation = useAdminMutation(
    (role: Exclude<AdminRole, 'SUPER_ADMIN'>) => adminApi.updateUserRole(id, role),
    [adminKeys.usersRoot(), adminKeys.user(id)],
    { successMessage: 'Role updated', errorFallback: 'Could not update role' },
  );
  const verifyMutation = useAdminMutation(
    async () => adminApi.verifyUser(id),
    [adminKeys.usersRoot(), adminKeys.user(id)],
    { successMessage: 'User verified', errorFallback: 'Could not verify user' },
  );
  const resetMutation = useAdminMutation(
    async () => adminApi.resetUserPassword(id),
    [adminKeys.usersRoot(), adminKeys.user(id)],
    { successMessage: 'Password reset email sent', errorFallback: 'Could not send reset email' },
  );
  const deleteMutation = useAdminMutation(
    async () => adminApi.deleteUser(id),
    [adminKeys.usersRoot(), adminKeys.user(id)],
    { successMessage: 'Account soft-deleted', errorFallback: 'Could not delete account' },
  );
  const restoreMutation = useAdminMutation(
    async () => adminApi.restoreUser(id),
    [adminKeys.usersRoot(), adminKeys.user(id)],
    { successMessage: 'Account restored', errorFallback: 'Could not restore account' },
  );
  const notesMutation = useAdminMutation(
    (value: string) => adminApi.updateUserNotes(id, value),
    [adminKeys.usersRoot(), adminKeys.user(id)],
    { successMessage: 'Notes saved', errorFallback: 'Could not save notes' },
  );
  const profileMutation = useAdminMutation(
    (values: EditValues) => adminApi.updateUser(id, values),
    [adminKeys.usersRoot(), adminKeys.user(id)],
    { successMessage: 'Profile updated', errorFallback: 'Could not update profile' },
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: user
      ? {
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          phone: user.phone.startsWith('+880') ? `0${user.phone.slice(4)}` : user.phone,
        }
      : undefined,
  });

  if (isStaff && !superAdmin) {
    return <AdminError>Only Super Admins can view staff profiles.</AdminError>;
  }

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-5">
        <AdminSkeleton className="h-7 w-48" />
        <AdminSkeleton className="h-44 w-full" />
        <AdminSkeleton className="h-64 w-full" />
      </div>
    );
  }

  if (detailQuery.isError || !user) {
    return (
      <div className="space-y-3">
        <AdminError>
          {getUserFacingErrorMessage(detailQuery.error, 'Account not found or failed to load.')}
        </AdminError>
        <Link href={listHref} className="text-xs font-bold uppercase text-[#C9A227]">
          ← Back
        </Link>
      </div>
    );
  }

  const protectedUser = user.id === currentUser.id || user.role === 'SUPER_ADMIN';
  const notesValue = notes ?? user.adminNotes ?? '';
  const pending =
    statusMutation.isPending ||
    verifyMutation.isPending ||
    resetMutation.isPending ||
    deleteMutation.isPending ||
    restoreMutation.isPending;

  async function runConfirm() {
    if (!confirm) return;
    switch (confirm) {
      case 'suspend':
      case 'block':
        await statusMutation.mutateAsync('SUSPENDED');
        break;
      case 'activate':
      case 'unblock':
        await statusMutation.mutateAsync('ACTIVE');
        break;
      case 'verify':
        await verifyMutation.mutateAsync(undefined as never);
        break;
      case 'reset':
        await resetMutation.mutateAsync(undefined as never);
        break;
      case 'delete':
        await deleteMutation.mutateAsync(undefined as never);
        break;
      case 'restore':
        await restoreMutation.mutateAsync(undefined as never);
        break;
    }
    setConfirm(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={listHref}
          className="text-[10px] font-bold uppercase tracking-[.08em] text-[#C9A227] hover:text-[#D4B03A]"
        >
          ← {isStaff ? 'Staff' : 'Users'}
        </Link>
        <div className="flex flex-wrap gap-2">
          <StatusPill>{user.role.replaceAll('_', ' ')}</StatusPill>
          <StatusPill>{user.status.replaceAll('_', ' ')}</StatusPill>
        </div>
      </div>

      <AdminPanel
        title={nameOf(user)}
        description={`Account since ${new Date(user.createdAt).toLocaleString()} · Updated ${new Date(user.updatedAt).toLocaleString()}`}
        actions={
          !protectedUser ? (
            <div className="flex flex-wrap gap-2">
              {!user.deletedAt ? (
                <>
                  <AdminButton variant="secondary" onClick={() => setConfirm('activate')}>
                    Activate
                  </AdminButton>
                  <AdminButton variant="secondary" onClick={() => setConfirm('suspend')}>
                    Suspend
                  </AdminButton>
                  <AdminButton variant="secondary" onClick={() => setConfirm('block')}>
                    Block
                  </AdminButton>
                  <AdminButton variant="secondary" onClick={() => setConfirm('unblock')}>
                    Unblock
                  </AdminButton>
                  <AdminButton variant="secondary" onClick={() => setConfirm('verify')}>
                    Verify
                  </AdminButton>
                  <AdminButton variant="secondary" onClick={() => setConfirm('reset')}>
                    Reset password
                  </AdminButton>
                  <AdminButton variant="danger" onClick={() => setConfirm('delete')}>
                    Soft delete
                  </AdminButton>
                </>
              ) : (
                <AdminButton variant="secondary" onClick={() => setConfirm('restore')}>
                  Restore
                </AdminButton>
              )}
            </div>
          ) : null
        }
      >
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Item label="Email" value={user.email} />
          <Item label="Phone" value={user.phone} />
          <Item label="Registration" value={user.registrationMethod} />
          <Item label="Verification" value={user.emailVerified ? 'Verified' : 'Unverified'} />
          <Item
            label="Last login"
            value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
          />
          <Item label="Orders" value={String(user.orderCount)} />
          <Item label="Total spending" value={formatTaka(user.totalSpending)} />
          <Item
            label="Deleted"
            value={user.deletedAt ? new Date(user.deletedAt).toLocaleString() : 'No'}
          />
        </dl>
      </AdminPanel>

      {!protectedUser && !user.deletedAt ? (
        <AdminPanel title="Edit profile" description="Update name and phone. Email is immutable.">
          <form
            className="grid gap-4 md:grid-cols-3"
            onSubmit={handleSubmit((values) =>
              profileMutation.mutate(values, { onSuccess: () => reset(values) }),
            )}
          >
            <Field label="First name" error={errors.firstName?.message}>
              <AdminInput {...register('firstName')} />
            </Field>
            <Field label="Last name" error={errors.lastName?.message}>
              <AdminInput {...register('lastName')} />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <AdminInput {...register('phone')} />
            </Field>
            {superAdmin && isStaff ? (
              <Field label="Role">
                <AdminSelect
                  value={user.role === 'SUPER_ADMIN' ? 'ADMIN' : user.role}
                  disabled={roleMutation.isPending || user.role === 'SUPER_ADMIN'}
                  onChange={(event) =>
                    roleMutation.mutate(event.target.value as 'ADMIN' | 'CUSTOMER')
                  }
                >
                  <option value="ADMIN">Admin</option>
                  <option value="CUSTOMER">Customer</option>
                </AdminSelect>
              </Field>
            ) : null}
            <div className="md:col-span-3">
              <AdminButton type="submit" disabled={!isDirty || profileMutation.isPending}>
                {profileMutation.isPending ? 'Saving…' : 'Save profile'}
              </AdminButton>
            </div>
          </form>
        </AdminPanel>
      ) : null}

      {isStaff ? (
        <AdminPanel
          title="Permissions"
          description="Role-based access inherited from the platform RBAC policy."
        >
          <ul className="grid gap-2 text-sm text-[#555555] sm:grid-cols-2">
            <li className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2">
              Manage customers (status, soft delete, verify)
            </li>
            <li className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2">
              Operate orders, returns, catalog, inventory, CRM
            </li>
            <li className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2">
              Cannot create or manage other administrators
            </li>
            <li className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2">
              Cannot assign SUPER_ADMIN or manage Super Admins
            </li>
          </ul>
        </AdminPanel>
      ) : null}

      <AdminPanel title="Notes" description="Internal only — never shown to the account holder.">
        <AdminTextarea
          rows={4}
          value={notesValue}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Add an internal note…"
        />
        <div className="mt-3">
          <AdminButton
            disabled={notesMutation.isPending || notesValue === (user.adminNotes ?? '')}
            onClick={() => notesMutation.mutate(notesValue)}
          >
            {notesMutation.isPending ? 'Saving…' : 'Save notes'}
          </AdminButton>
        </div>
      </AdminPanel>

      {!isStaff ? (
        <>
          <AddressSection title="Shipping addresses" rows={user.shippingAddresses} />
          <AddressSection title="Billing addresses" rows={user.billingAddresses} />

          <AdminPanel title="Order history">
            {user.orders.length === 0 ? <AdminEmpty>No orders yet.</AdminEmpty> : null}
            {user.orders.length > 0 ? (
              <AdminTable>
                <thead>
                  <tr>
                    <AdminTh>Order</AdminTh>
                    <AdminTh>Date</AdminTh>
                    <AdminTh>Items</AdminTh>
                    <AdminTh>Total</AdminTh>
                    <AdminTh>Status</AdminTh>
                  </tr>
                </thead>
                <tbody>
                  {user.orders.map((order) => (
                    <tr key={order.id}>
                      <AdminTd>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-semibold text-[#C9A227]"
                        >
                          #{order.number}
                        </Link>
                      </AdminTd>
                      <AdminTd>{new Date(order.createdAt).toLocaleDateString()}</AdminTd>
                      <AdminTd>{order.itemCount}</AdminTd>
                      <AdminTd>{formatTaka(order.total)}</AdminTd>
                      <AdminTd>
                        <StatusPill>{order.status.replaceAll('_', ' ')}</StatusPill>
                      </AdminTd>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            ) : null}
          </AdminPanel>

          <AdminPanel title="Wishlist">
            {user.wishlist.length === 0 ? <AdminEmpty>Wishlist is empty.</AdminEmpty> : null}
            {user.wishlist.length > 0 ? (
              <AdminTable>
                <thead>
                  <tr>
                    <AdminTh>Product</AdminTh>
                    <AdminTh>Added</AdminTh>
                  </tr>
                </thead>
                <tbody>
                  {user.wishlist.map((item) => (
                    <tr key={`${item.productId}-${item.addedAt}`}>
                      <AdminTd>
                        <Link
                          href={`/product/${item.slug}`}
                          className="font-semibold text-[#111111] hover:text-[#C9A227]"
                        >
                          {item.name}
                        </Link>
                      </AdminTd>
                      <AdminTd>{new Date(item.addedAt).toLocaleDateString()}</AdminTd>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            ) : null}
          </AdminPanel>

          <AdminPanel title="Reviews">
            {user.reviews.length === 0 ? <AdminEmpty>No reviews yet.</AdminEmpty> : null}
            {user.reviews.length > 0 ? (
              <AdminTable>
                <thead>
                  <tr>
                    <AdminTh>Product</AdminTh>
                    <AdminTh>Rating</AdminTh>
                    <AdminTh>Title</AdminTh>
                    <AdminTh>Status</AdminTh>
                    <AdminTh>Date</AdminTh>
                  </tr>
                </thead>
                <tbody>
                  {user.reviews.map((review) => (
                    <tr key={review.id}>
                      <AdminTd>{review.productName}</AdminTd>
                      <AdminTd>{review.rating}</AdminTd>
                      <AdminTd>{review.title}</AdminTd>
                      <AdminTd>
                        <StatusPill>{review.status.replaceAll('_', ' ')}</StatusPill>
                      </AdminTd>
                      <AdminTd>{new Date(review.createdAt).toLocaleDateString()}</AdminTd>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            ) : null}
          </AdminPanel>

          <AdminPanel title="Activity timeline">
            {user.activity.length === 0 ? <AdminEmpty>No activity recorded.</AdminEmpty> : null}
            {user.activity.length > 0 ? (
              <ul className="space-y-3">
                {user.activity.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2.5"
                  >
                    <p className="text-sm font-semibold text-[#111111]">{event.title}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[.08em] text-[#555555]">
                      {event.eventType.replaceAll('_', ' ')} ·{' '}
                      {new Date(event.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </AdminPanel>
        </>
      ) : null}

      <AdminPanel title="Login history">
        {user.loginHistory.length === 0 ? <AdminEmpty>No login sessions.</AdminEmpty> : null}
        {user.loginHistory.length > 0 ? (
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>Signed in</AdminTh>
                <AdminTh>Last seen</AdminTh>
                <AdminTh>IP</AdminTh>
                <AdminTh>Device</AdminTh>
                <AdminTh>Status</AdminTh>
              </tr>
            </thead>
            <tbody>
              {user.loginHistory.map((session) => (
                <tr key={session.id}>
                  <AdminTd>{new Date(session.createdAt).toLocaleString()}</AdminTd>
                  <AdminTd>{new Date(session.lastSeenAt).toLocaleString()}</AdminTd>
                  <AdminTd>{session.ip ?? '—'}</AdminTd>
                  <AdminTd className="max-w-[220px] truncate text-xs text-[#555555]">
                    {session.userAgent ?? '—'}
                  </AdminTd>
                  <AdminTd>
                    <StatusPill>
                      {session.active ? 'Active' : session.revokedAt ? 'Revoked' : 'Expired'}
                    </StatusPill>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : null}
      </AdminPanel>

      <AdminPanel title="Audit trail">
        {user.auditTrail.length === 0 ? <AdminEmpty>No audit events.</AdminEmpty> : null}
        {user.auditTrail.length > 0 ? (
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>When</AdminTh>
                <AdminTh>Action</AdminTh>
                <AdminTh>Actor</AdminTh>
                <AdminTh>Resource</AdminTh>
              </tr>
            </thead>
            <tbody>
              {user.auditTrail.map((entry) => (
                <tr key={entry.id}>
                  <AdminTd>{new Date(entry.createdAt).toLocaleString()}</AdminTd>
                  <AdminTd>{entry.action}</AdminTd>
                  <AdminTd className="text-xs text-[#555555]">
                    {entry.actorRole ?? 'system'}
                    {entry.actorUserId ? ` · ${entry.actorUserId.slice(0, 8)}` : ''}
                  </AdminTd>
                  <AdminTd className="text-xs text-[#555555]">
                    {entry.resourceType}/{entry.resourceId.slice(0, 8)}
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : null}
      </AdminPanel>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm ? confirm.replaceAll('_', ' ') : ''}
        message={`Confirm ${confirm ?? ''} for ${nameOf(user)}?`}
        confirmLabel="Confirm"
        loading={pending}
        onClose={() => (pending ? undefined : setConfirm(null))}
        onConfirm={() => void runConfirm()}
      />
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[.08em] text-[#555555]">{label}</dt>
      <dd className="mt-1 font-semibold text-[#111111]">{value}</dd>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium text-[#555555]">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

function AddressSection({
  title,
  rows,
}: {
  title: string;
  rows: AdminUserDetail['shippingAddresses'];
}) {
  return (
    <AdminPanel title={title}>
      {rows.length === 0 ? <AdminEmpty>No addresses on file.</AdminEmpty> : null}
      {rows.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((address) => (
            <article
              key={address.id}
              className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-4 text-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-semibold text-[#111111]">{address.label}</p>
                {address.isDefault ? <StatusPill>Default</StatusPill> : null}
              </div>
              <p className="text-[#555555]">{address.fullName}</p>
              <p className="text-[#555555]">{address.phone}</p>
              <p className="mt-2 text-[#555555]">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ''}
              </p>
              <p className="text-[#555555]">
                {address.city}, {address.district} {address.postalCode}
              </p>
              <p className="text-[#555555]">{address.country}</p>
            </article>
          ))}
        </div>
      ) : null}
    </AdminPanel>
  );
}

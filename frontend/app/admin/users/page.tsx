'use client';

import axios from 'axios';
import type { PropsWithChildren } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminInput,
  AdminPanel,
  AdminSelect,
  AdminTable,
  AdminTd,
  AdminTh,
  StatusPill,
} from '@/components/admin/admin-ui';
import {
  adminApi,
  useAdminMutation,
  useAdminUsers,
  type AdminRole,
  type UserStatus,
} from '@/features/admin';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';

const createAdminSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().max(320),
  phone: z.string().regex(/^(?:\+8801|01)[3-9]\d{8}$/, 'Use a valid Bangladeshi mobile number'),
  password: z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/\d/),
});

type CreateAdminValues = z.infer<typeof createAdminSchema>;

function errorMessage(error: unknown) {
  return axios.isAxiosError<{ message?: string }>(error)
    ? (error.response?.data.message ?? 'The request could not be completed.')
    : 'The request could not be completed.';
}

export default function AdminUsersPage() {
  const currentUser = useAppSelector(selectAuthUser)!;
  const superAdmin = currentUser.role === 'SUPER_ADMIN';
  const users = useAdminUsers({ limit: 50 });
  const statusMutation = useAdminMutation(({ id, status }: { id: string; status: UserStatus }) =>
    adminApi.updateUserStatus(id, status),
  );
  const roleMutation = useAdminMutation(
    ({ id, role }: { id: string; role: 'ADMIN' | 'CUSTOMER' }) => adminApi.updateUserRole(id, role),
  );
  const deleteMutation = useAdminMutation((id: string) => adminApi.deleteUser(id));
  const createAdmin = useAdminMutation((values: CreateAdminValues) => adminApi.createAdmin(values));
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAdminValues>({ resolver: zodResolver(createAdminSchema) });

  return (
    <div className="space-y-5">
      <AdminPanel title="Users" description="Manage customer access and account lifecycle.">
        {users.isError ? <AdminError>Could not load users.</AdminError> : null}
        {statusMutation.isError || roleMutation.isError || deleteMutation.isError ? (
          <AdminError>
            {errorMessage(statusMutation.error ?? roleMutation.error ?? deleteMutation.error)}
          </AdminError>
        ) : null}
        {users.isLoading ? <AdminEmpty>Loading users…</AdminEmpty> : null}
        {users.data?.data.length === 0 ? <AdminEmpty>No users found.</AdminEmpty> : null}
        {(users.data?.data.length ?? 0) > 0 ? (
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>User</AdminTh>
                <AdminTh>Role</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh>Joined</AdminTh>
                <AdminTh>Actions</AdminTh>
              </tr>
            </thead>
            <tbody>
              {users.data?.data.map((user) => {
                const protectedUser = user.id === currentUser.id || user.role === 'SUPER_ADMIN';
                return (
                  <tr key={user.id}>
                    <AdminTd>
                      <p className="font-semibold text-white">
                        {[user.firstName, user.lastName].filter(Boolean).join(' ') ||
                          'Unnamed user'}
                      </p>
                      <p className="text-xs text-[#b5b0a8]">{user.email}</p>
                      <p className="text-xs text-[#8b867d]">{user.phone}</p>
                    </AdminTd>
                    <AdminTd>
                      {superAdmin && !protectedUser ? (
                        <AdminSelect
                          aria-label={`Role for ${user.email}`}
                          value={user.role}
                          disabled={roleMutation.isPending}
                          onChange={(event) =>
                            roleMutation.mutate({
                              id: user.id,
                              role: event.target.value as Exclude<AdminRole, 'SUPER_ADMIN'>,
                            })
                          }
                        >
                          <option value="CUSTOMER">Customer</option>
                          <option value="ADMIN">Admin</option>
                        </AdminSelect>
                      ) : (
                        <StatusPill>{user.role.replaceAll('_', ' ')}</StatusPill>
                      )}
                    </AdminTd>
                    <AdminTd>
                      {user.status === 'PENDING_VERIFICATION' || protectedUser ? (
                        <StatusPill>{user.status.replaceAll('_', ' ')}</StatusPill>
                      ) : (
                        <AdminSelect
                          aria-label={`Status for ${user.email}`}
                          value={user.status}
                          disabled={statusMutation.isPending}
                          onChange={(event) =>
                            statusMutation.mutate({
                              id: user.id,
                              status: event.target.value as UserStatus,
                            })
                          }
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="SUSPENDED">Suspended</option>
                        </AdminSelect>
                      )}
                    </AdminTd>
                    <AdminTd>{new Date(user.createdAt).toLocaleDateString()}</AdminTd>
                    <AdminTd>
                      <AdminButton
                        variant="danger"
                        disabled={protectedUser || deleteMutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Soft delete ${user.email}? This revokes all active sessions.`,
                            )
                          ) {
                            deleteMutation.mutate(user.id);
                          }
                        }}
                      >
                        Soft delete
                      </AdminButton>
                    </AdminTd>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>
        ) : null}
      </AdminPanel>

      {superAdmin ? (
        <AdminPanel
          title="Create administrator"
          description="Super Admin only. The new account receives the Admin role."
        >
          <form
            onSubmit={handleSubmit((values) =>
              createAdmin.mutate(values, { onSuccess: () => reset() }),
            )}
            className="grid gap-4 md:grid-cols-2"
          >
            <Field label="First name" error={errors.firstName?.message}>
              <AdminInput {...register('firstName')} />
            </Field>
            <Field label="Last name" error={errors.lastName?.message}>
              <AdminInput {...register('lastName')} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <AdminInput type="email" {...register('email')} />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <AdminInput {...register('phone')} />
            </Field>
            <Field
              label="Temporary password"
              error={errors.password?.message}
              className="md:col-span-2"
            >
              <AdminInput type="password" autoComplete="new-password" {...register('password')} />
            </Field>
            {createAdmin.isError ? (
              <div className="md:col-span-2">
                <AdminError>{errorMessage(createAdmin.error)}</AdminError>
              </div>
            ) : null}
            <div className="md:col-span-2">
              <AdminButton type="submit" disabled={createAdmin.isPending}>
                {createAdmin.isPending ? 'Creating…' : 'Create admin'}
              </AdminButton>
            </div>
          </form>
        </AdminPanel>
      ) : null}
    </div>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: PropsWithChildren<{ label: string; error?: string; className?: string }>) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-medium text-[#d8d4cd]">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-400">{error}</span> : null}
    </label>
  );
}

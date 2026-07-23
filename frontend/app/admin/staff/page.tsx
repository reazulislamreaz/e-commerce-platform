'use client';

import type { PropsWithChildren } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AdminButton, AdminError, AdminInput, AdminPanel } from '@/components/admin/admin-ui';
import { AccountDirectory } from '@/features/admin/components/account-directory';
import { adminApi, adminKeys, useAdminMutation } from '@/features/admin';
import { getUserFacingErrorMessage } from '@/lib/user-facing-error';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';

const createAdminSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().max(320),
  phone: z.string().regex(/^(?:\+8801|01)[3-9]\d{8}$/, 'Use a valid Bangladeshi mobile number'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

type CreateAdminValues = z.infer<typeof createAdminSchema>;

export default function AdminStaffPage() {
  const currentUser = useAppSelector(selectAuthUser)!;
  const superAdmin = currentUser.role === 'SUPER_ADMIN';
  const createAdmin = useAdminMutation(
    (values: CreateAdminValues) => adminApi.createAdmin(values),
    [adminKeys.usersRoot()],
    { successMessage: 'Staff account created', errorFallback: 'Could not create staff account' },
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAdminValues>({ resolver: zodResolver(createAdminSchema) });

  return (
    <div className="space-y-6">
      <AccountDirectory mode="staff" />
      {superAdmin ? (
        <AdminPanel
          title="Create staff administrator"
          description="Super Admin only. The new account receives the Admin role and is pre-verified."
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
                <AdminError>
                  {getUserFacingErrorMessage(
                    createAdmin.error,
                    'The request could not be completed. Please try again.',
                  )}
                </AdminError>
              </div>
            ) : null}
            <div className="md:col-span-2">
              <AdminButton type="submit" disabled={createAdmin.isPending}>
                {createAdmin.isPending ? 'Creating…' : 'Create staff account'}
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
      <span className="mb-1.5 block text-sm font-medium text-[#555555]">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

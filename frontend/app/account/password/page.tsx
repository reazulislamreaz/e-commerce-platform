'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '@/components/common/form-field';
import { useChangePassword } from '@/features/auth/hooks';
import { changePasswordSchema, type ChangePasswordInput } from '@/features/auth/schemas';
import { getUserFacingErrorMessage, USER_FACING_ERRORS } from '@/lib/user-facing-error';

export default function ChangePasswordPage() {
  const changePassword = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = handleSubmit(async (input) => {
    await changePassword
      .mutateAsync({ currentPassword: input.currentPassword, password: input.password })
      .then(() => reset())
      .catch(() => undefined);
  });

  const serverError =
    changePassword.isError &&
    getUserFacingErrorMessage(changePassword.error, USER_FACING_ERRORS.GENERIC);

  return (
    <div className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5">
      <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">
        Change Password
      </h2>
      <form onSubmit={onSubmit} className="mt-5 max-w-md space-y-4">
        <FormField
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <FormField
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <FormField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        {serverError && (
          <p role="alert" className="text-sm text-red-300">
            {serverError}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-5 py-3 text-[11px] font-bold uppercase text-[#18120b] disabled:opacity-50"
        >
          {isSubmitting ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

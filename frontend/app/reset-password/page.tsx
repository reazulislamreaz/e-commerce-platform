'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '@/components/common/form-field';
import { useResetPassword } from '@/features/auth/hooks';
import { resetPasswordSchema, type ResetPasswordInput } from '@/features/auth/schemas';
import { getUserFacingErrorMessage, USER_FACING_ERRORS } from '@/lib/user-facing-error';

function ResetPasswordForm() {
  const token = useSearchParams().get('token');
  const resetPassword = useResetPassword();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  if (!token) {
    return (
      <div className="mt-6 space-y-4">
        <p
          role="alert"
          className="rounded-[4px] border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
        >
          This reset link is incomplete. Open the link from your email, or request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block rounded-[4px] border border-[#111111] bg-[#111111] px-5 py-3 text-xs font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  if (resetPassword.isSuccess) {
    return (
      <div className="mt-6 space-y-4">
        <p className="rounded-[4px] border border-green-200 bg-[#f0fdf4] px-3.5 py-3 text-sm text-green-700">
          Your password has been updated and all sessions were signed out. You can now sign in with
          your new password.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-[4px] border border-[#111111] bg-[#111111] px-5 py-3 text-xs font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  const serverError =
    resetPassword.isError &&
    getUserFacingErrorMessage(resetPassword.error, USER_FACING_ERRORS.GENERIC);

  const onSubmit = handleSubmit(async (input) => {
    await resetPassword.mutateAsync({ token, password: input.password }).catch(() => undefined);
  });

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <FormField
        label="New password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <FormField
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      {serverError && (
        <div
          role="alert"
          className="space-y-2 rounded-[4px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          <p>{serverError}</p>
          <Link href="/forgot-password" className="block text-[#C9A227] hover:text-[#D4B03A]">
            Request a new reset link →
          </Link>
        </div>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-[4px] border border-[#111111] bg-[#111111] py-3 text-xs font-bold uppercase tracking-[.08em] text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111] disabled:opacity-50"
      >
        {isSubmitting ? 'Updating…' : 'Reset Password'}
      </button>
      <Link href="/login" className="block text-center text-sm text-[#555555] hover:text-[#C9A227]">
        ← Back to login
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main
      id="main-content"
      className="flex flex-1 items-center justify-center bg-[#FAFAFA] px-5 py-16"
    >
      <div className="w-full max-w-md rounded-[4px] border border-[#E5E7EB] bg-white p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
          Account
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-[#111111]">Reset Password</h1>
        <Suspense fallback={<p className="mt-6 text-sm text-[#555555]">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}

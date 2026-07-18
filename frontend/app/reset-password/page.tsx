'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { FormField } from '@/components/common/form-field';
import { useResetPassword } from '@/features/auth/hooks';
import { resetPasswordSchema, type ResetPasswordInput } from '@/features/auth/schemas';

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
          className="rounded-[4px] border border-red-900/60 bg-red-950/50 px-3.5 py-3 text-sm text-red-300"
        >
          This reset link is missing its token. Open the link from your email, or request a new
          one.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block rounded-[4px] bg-[#e5bd78] px-5 py-3 text-xs font-bold uppercase text-[#18120b]"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  if (resetPassword.isSuccess) {
    return (
      <div className="mt-6 space-y-4">
        <p className="rounded-[4px] border border-[#2d4a2d] bg-[#102010] px-3.5 py-3 text-sm text-[#8fbf8f]">
          Your password has been updated and all sessions were signed out. You can now sign in
          with your new password.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-[4px] bg-[#e5bd78] px-5 py-3 text-xs font-bold uppercase text-[#18120b]"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  const serverError =
    resetPassword.isError &&
    (axios.isAxiosError<{ message?: string }>(resetPassword.error) &&
    resetPassword.error.response?.status === 400
      ? (resetPassword.error.response.data.message ?? 'Reset link is invalid or has expired.')
      : 'Something went wrong. Please try again.');

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
          className="space-y-2 rounded-[4px] border border-red-900/60 bg-red-950/50 px-3.5 py-2.5 text-sm text-red-300"
        >
          <p>{serverError}</p>
          <Link href="/forgot-password" className="block text-[#e3bb78] hover:text-[#eec98a]">
            Request a new reset link →
          </Link>
        </div>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-[4px] bg-[#e5bd78] py-3 text-xs font-bold uppercase tracking-[.08em] text-[#18120b] hover:bg-[#eec98a] disabled:opacity-50"
      >
        {isSubmitting ? 'Updating…' : 'Reset Password'}
      </button>
      <Link href="/login" className="block text-center text-sm text-[#b5b0a8] hover:text-[#e3bb78]">
        ← Back to login
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main id="main-content" className="flex flex-1 items-center justify-center bg-black px-5 py-16">
      <div className="w-full max-w-md rounded-[4px] border border-[#2d2a27] bg-[#111110] p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          Account
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-white">Reset Password</h1>
        <Suspense fallback={<p className="mt-6 text-sm text-[#b5b0a8]">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}

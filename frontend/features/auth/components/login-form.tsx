'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '@/components/common/form-field';
import { GoogleLoginButton } from '@/features/auth/components/google-login-button';
import { useLogin } from '@/features/auth/hooks';
import { loginSchema, type LoginInput } from '@/features/auth/schemas';
import { getUserFacingErrorMessage, USER_FACING_ERRORS } from '@/lib/user-facing-error';

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const login = useLogin();
  const [rememberMe, setRememberMe] = useState(true);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (input) => {
    try {
      const result = await login.mutateAsync({ ...input, rememberMe });
      const isAdmin = result.user.role === 'ADMIN' || result.user.role === 'SUPER_ADMIN';
      router.replace(isAdmin ? '/admin' : next);
    } catch {
      // Inline alert below shows a user-facing message.
    }
  });

  const serverError =
    login.isError && getUserFacingErrorMessage(login.error, USER_FACING_ERRORS.SIGN_IN_FAILED);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField
        label="Email"
        hideLabel
        type="email"
        autoComplete="email"
        placeholder="Email"
        error={errors.email?.message}
        {...register('email')}
      />
      <FormField
        label="Password"
        hideLabel
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        error={errors.password?.message}
        {...register('password')}
      />
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-[#555555]">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="accent-[#C9A227]"
          />
          Remember me
        </label>
        <Link
          href="/forgot-password"
          className="text-xs font-medium text-[#555555] underline underline-offset-2 transition-colors hover:text-[#C9A227]"
        >
          Forgot Password?
        </Link>
      </div>
      {serverError && (
        <p
          role="alert"
          className="rounded-[4px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {serverError}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-[4px] border border-[#111111] bg-[#111111] py-3 text-xs font-bold uppercase tracking-[.08em] text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227] disabled:opacity-50"
      >
        {isSubmitting ? 'Signing In…' : 'Login'}
      </button>
      <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.15em] text-[#555555]">
        <span aria-hidden className="h-px flex-1 bg-[#E5E7EB]" />
        or login with
        <span aria-hidden className="h-px flex-1 bg-[#E5E7EB]" />
      </div>
      <GoogleLoginButton label="Login with Google" />
      <p className="pt-2 text-center text-sm text-[#555555]">
        Doesn&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-semibold text-[#C9A227] transition-colors hover:text-[#D4B03A]"
        >
          Sign Up
        </Link>
      </p>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<p className="text-sm text-[#555555]">Loading…</p>}>
      <LoginFormInner />
    </Suspense>
  );
}

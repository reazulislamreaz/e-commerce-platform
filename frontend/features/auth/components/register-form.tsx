'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '@/components/common/form-field';
import { GoogleLoginButton } from '@/features/auth/components/google-login-button';
import { useRegister } from '@/features/auth/hooks';
import { registerSchema, type RegisterInput } from '@/features/auth/schemas';
import { getUserFacingErrorMessage, USER_FACING_ERRORS } from '@/lib/user-facing-error';
import { loginHref, resolvePostAuthPath } from '@/lib/auth-redirect';

function RegisterFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (input) => {
    try {
      await registerMutation.mutateAsync(input);
      router.replace(resolvePostAuthPath(next));
    } catch {
      // Inline alert below shows a user-facing message.
    }
  });

  const serverError =
    registerMutation.isError &&
    getUserFacingErrorMessage(registerMutation.error, USER_FACING_ERRORS.REGISTER_FAILED);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField
        label="Full name"
        hideLabel
        autoComplete="name"
        placeholder="Full name"
        error={errors.fullName?.message}
        {...register('fullName')}
      />
      <FormField
        label="Email address"
        hideLabel
        type="email"
        autoComplete="email"
        placeholder="Email address"
        error={errors.email?.message}
        {...register('email')}
      />
      <FormField
        label="Phone number"
        hideLabel
        type="tel"
        autoComplete="tel"
        placeholder="Phone number (e.g. 01712345678)"
        hint="Bangladeshi mobile number — 01712345678 or +8801712345678."
        error={errors.phone?.message}
        {...register('phone')}
      />
      <FormField
        label="Password"
        hideLabel
        type="password"
        autoComplete="new-password"
        placeholder="Password"
        hint="At least 6 characters."
        error={errors.password?.message}
        {...register('password')}
      />
      <FormField
        label="Confirm password"
        hideLabel
        type="password"
        autoComplete="new-password"
        placeholder="Confirm password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
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
        {isSubmitting ? 'Creating Account…' : 'Create Account'}
      </button>
      <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.15em] text-[#555555]">
        <span aria-hidden className="h-px flex-1 bg-[#E5E7EB]" />
        or sign up with
        <span aria-hidden className="h-px flex-1 bg-[#E5E7EB]" />
      </div>
      <GoogleLoginButton label="Sign up with Google" />
      <p className="pt-2 text-center text-sm text-[#555555]">
        Already have an account?{' '}
        <Link
          href={loginHref(next)}
          className="font-semibold text-[#C9A227] transition-colors hover:text-[#D4B03A]"
        >
          Sign In
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  return (
    <Suspense fallback={<p className="text-sm text-[#555555]">Loading…</p>}>
      <RegisterFormInner />
    </Suspense>
  );
}

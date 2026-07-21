'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { FormField } from '@/components/common/form-field';
import { GoogleLoginButton } from '@/features/auth/components/google-login-button';
import { useRegister, useResendVerification } from '@/features/auth/hooks';
import { registerSchema, type RegisterInput } from '@/features/auth/schemas';
import { getUserFacingErrorMessage } from '@/lib/user-facing-error';

function CheckInbox({ email }: { email: string }) {
  const resend = useResendVerification();
  return (
    <div className="space-y-5 text-center" role="status">
      <MailCheck aria-hidden className="mx-auto size-12 text-[#e3bb78]" strokeWidth={1.5} />
      <div>
        <h2 className="text-xl font-bold uppercase tracking-[-.02em] text-white">
          Check your inbox
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#b5b0a8]">
          We sent a verification link to <span className="font-semibold text-white">{email}</span>.
          Click the link to activate your account, then sign in.
        </p>
      </div>
      <button
        type="button"
        onClick={() => resend.mutate(email)}
        disabled={resend.isPending || resend.isSuccess}
        className="text-sm font-semibold text-[#e3bb78] transition-colors hover:text-[#eec98a] disabled:opacity-60"
      >
        {resend.isSuccess
          ? 'Verification email re-sent'
          : resend.isPending
            ? 'Sending…'
            : 'Resend verification email'}
      </button>
      <p className="text-sm text-[#b5b0a8]">
        Already verified?{' '}
        <Link
          href="/login"
          className="font-semibold text-[#e3bb78] transition-colors hover:text-[#eec98a]"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}

export function RegisterForm() {
  const registerMutation = useRegister();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (input) => {
    try {
      await registerMutation.mutateAsync(input);
      setSubmittedEmail(input.email);
    } catch {
      // Inline alert below shows a user-facing message.
    }
  });

  if (submittedEmail) return <CheckInbox email={submittedEmail} />;

  const serverError =
    registerMutation.isError &&
    getUserFacingErrorMessage(
      registerMutation.error,
      'Could not create your account. Please check your details and try again.',
    );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="First name"
          hideLabel
          autoComplete="given-name"
          placeholder="First name"
          error={errors.firstName?.message}
          {...register('firstName')}
        />
        <FormField
          label="Last name"
          hideLabel
          autoComplete="family-name"
          placeholder="Last name"
          error={errors.lastName?.message}
          {...register('lastName')}
        />
      </div>
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
        label="Mobile number"
        hideLabel
        type="tel"
        autoComplete="tel"
        placeholder="Mobile number (e.g. 01712345678)"
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
        hint="12+ characters with an uppercase letter, a lowercase letter, and a digit."
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
          className="rounded-[4px] border border-red-900/60 bg-red-950/50 px-3.5 py-2.5 text-sm text-red-300"
        >
          {serverError}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-[4px] bg-[#e5bd78] py-3 text-xs font-bold uppercase tracking-[.08em] text-[#18120b] transition-colors hover:bg-[#eec98a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3bb78] disabled:opacity-50"
      >
        {isSubmitting ? 'Creating Account…' : 'Create Account'}
      </button>
      <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.15em] text-[#8b867d]">
        <span aria-hidden className="h-px flex-1 bg-[#2d2a27]" />
        or sign up with
        <span aria-hidden className="h-px flex-1 bg-[#2d2a27]" />
      </div>
      <GoogleLoginButton label="Sign up with Google" />
      <p className="pt-2 text-center text-sm text-[#b5b0a8]">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-[#e3bb78] transition-colors hover:text-[#eec98a]"
        >
          Sign In
        </Link>
      </p>
    </form>
  );
}

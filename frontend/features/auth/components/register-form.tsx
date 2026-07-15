'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { FormField } from '@/components/common/form-field';
import { GoogleLoginButton } from '@/features/auth/components/google-login-button';
import { useLogin, useRegister } from '@/features/auth/hooks';
import { registerSchema, type RegisterInput } from '@/features/auth/schemas';

export function RegisterForm() {
  const router = useRouter();
  const registerMutation = useRegister();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (input) => {
    await registerMutation.mutateAsync(input);
    await login.mutateAsync({ email: input.email, password: input.password });
    router.push('/');
  });

  const serverError =
    registerMutation.isError &&
    (axios.isAxiosError(registerMutation.error) && registerMutation.error.response?.status === 409
      ? 'This email is already registered.'
      : 'Something went wrong. Please try again.');

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
        <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {serverError}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-ink py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50"
      >
        {isSubmitting ? 'Creating account…' : 'Create Account'}
      </button>
      <p className="text-center text-xs text-zinc-400">or sign up with</p>
      <GoogleLoginButton label="Sign up with Google" />
      <p className="pt-2 text-center text-sm text-zinc-600">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-ink underline underline-offset-2 transition-colors hover:text-gold-dark"
        >
          Sign In
        </Link>
      </p>
    </form>
  );
}

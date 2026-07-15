'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { FormField } from '@/components/common/form-field';
import { GoogleLoginButton } from '@/features/auth/components/google-login-button';
import { useLogin } from '@/features/auth/hooks';
import { loginSchema, type LoginInput } from '@/features/auth/schemas';

export function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (input) => {
    await login.mutateAsync(input);
    router.push('/');
  });

  const serverError =
    login.isError &&
    (axios.isAxiosError(login.error) && login.error.response?.status === 401
      ? 'Invalid email or password.'
      : 'Something went wrong. Please try again.');

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
      <div className="text-right">
        <Link
          href="/forgot-password"
          className="text-xs font-medium text-zinc-500 underline underline-offset-2 transition-colors hover:text-ink"
        >
          Forgot Password?
        </Link>
      </div>
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
        {isSubmitting ? 'Signing in…' : 'Login'}
      </button>
      <p className="text-center text-xs text-zinc-400">or login with</p>
      <GoogleLoginButton label="Login with Google" />
      <p className="pt-2 text-center text-sm text-zinc-600">
        Doesn&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-semibold text-ink underline underline-offset-2 transition-colors hover:text-gold-dark"
        >
          Sign Up
        </Link>
      </p>
    </form>
  );
}

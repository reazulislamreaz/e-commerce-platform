'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { FormField } from '@/components/common/form-field';
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
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <div>
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="mt-2 text-right">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-zinc-500 transition-colors hover:text-gold-dark"
          >
            Forgot your password?
          </Link>
        </div>
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
      <div className="relative py-1" aria-hidden>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs uppercase tracking-wider text-zinc-400">
            New to ElevateApparel?
          </span>
        </div>
      </div>
      <Link
        href="/register"
        className="block w-full rounded-lg border border-gold bg-gold/5 py-3 text-center text-sm font-semibold text-gold-dark transition-colors hover:bg-gold/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        Create an account
      </Link>
    </form>
  );
}

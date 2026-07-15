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
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <FormField
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="Your password"
        error={errors.password?.message}
        {...register('password')}
      />
      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {serverError}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
      >
        {isSubmitting ? 'Signing in…' : 'Login'}
      </button>
      <p className="text-center text-sm text-zinc-600">
        New here?{' '}
        <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-700">
          Create an account
        </Link>
      </p>
    </form>
  );
}

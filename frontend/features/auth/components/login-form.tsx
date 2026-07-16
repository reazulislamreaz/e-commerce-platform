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
          className="text-xs font-medium text-[#b5b0a8] underline underline-offset-2 transition-colors hover:text-[#e3bb78]"
        >
          Forgot Password?
        </Link>
      </div>
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
        {isSubmitting ? 'Signing In…' : 'Login'}
      </button>
      <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.15em] text-[#8b867d]">
        <span aria-hidden className="h-px flex-1 bg-[#2d2a27]" />
        or login with
        <span aria-hidden className="h-px flex-1 bg-[#2d2a27]" />
      </div>
      <GoogleLoginButton label="Login with Google" />
      <p className="pt-2 text-center text-sm text-[#b5b0a8]">
        Doesn&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-semibold text-[#e3bb78] transition-colors hover:text-[#eec98a]"
        >
          Sign Up
        </Link>
      </p>
    </form>
  );
}

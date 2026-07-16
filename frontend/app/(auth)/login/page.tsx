import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your Elevate Apparel account.',
};

export default function LoginPage() {
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
        Welcome back
      </p>
      <h1 className="mb-8 mt-1.5 text-4xl font-extrabold uppercase tracking-[-.03em] text-white">
        Login
      </h1>
      <LoginForm />
    </>
  );
}

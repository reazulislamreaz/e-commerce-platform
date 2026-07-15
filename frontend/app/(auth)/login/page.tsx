import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your account.',
};

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Welcome back</h1>
      <p className="mb-6 mt-1 text-sm text-zinc-500">Sign in to continue shopping.</p>
      <LoginForm />
    </>
  );
}

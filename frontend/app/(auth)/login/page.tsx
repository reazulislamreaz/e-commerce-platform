import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your ElevateApparel account.',
};

export default function LoginPage() {
  return (
    <>
      <div className="mb-8">
        <div className="mb-5 h-1 w-12 rounded-full bg-gold" />
        <h1 className="text-3xl font-bold tracking-tight text-ink">Welcome back</h1>
        <p className="mt-2 text-sm text-zinc-500">Sign in to continue to your account.</p>
      </div>
      <LoginForm />
    </>
  );
}

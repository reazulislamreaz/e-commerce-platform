import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your ElevateApparel account.',
};

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-8 font-serif text-4xl font-semibold text-ink">Login</h1>
      <LoginForm />
    </>
  );
}

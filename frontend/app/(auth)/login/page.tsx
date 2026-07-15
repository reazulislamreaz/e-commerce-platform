import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/login-form';
import { playfair } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your ElevateApparel account.',
};

export default function LoginPage() {
  return (
    <>
      <h1 className={`${playfair.className} mb-8 text-4xl font-semibold text-ink`}>Login</h1>
      <LoginForm />
    </>
  );
}

import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth/components/register-form';
import { playfair } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a new ElevateApparel customer account.',
};

export default function RegisterPage() {
  return (
    <>
      <h1 className={`${playfair.className} mb-8 text-4xl font-semibold text-ink`}>Sign Up</h1>
      <RegisterForm />
    </>
  );
}

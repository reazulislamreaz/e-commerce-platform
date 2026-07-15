import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth/components/register-form';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a new ElevateApparel customer account.',
};

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-8 font-serif text-4xl font-semibold text-ink">Sign Up</h1>
      <RegisterForm />
    </>
  );
}

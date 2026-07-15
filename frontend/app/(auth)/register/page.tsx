import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth/components/register-form';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a new customer account.',
};

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Create your account</h1>
      <p className="mb-6 mt-1 text-sm text-zinc-500">
        Join us for exclusive offers and faster checkout.
      </p>
      <RegisterForm />
    </>
  );
}

import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth/components/register-form';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a new ElevateApparel customer account.',
};

export default function RegisterPage() {
  return (
    <>
      <div className="mb-8">
        <div className="mb-5 h-1 w-12 rounded-full bg-gold" />
        <h1 className="text-3xl font-bold tracking-tight text-ink">Create account</h1>
        <p className="mt-2 text-sm text-zinc-500">Join us today and start shopping.</p>
      </div>
      <RegisterForm />
    </>
  );
}

import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth/components/register-form';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a new Elevate Apparel customer account.',
};

export default function RegisterPage() {
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
        Join the movement
      </p>
      <h1 className="mb-8 mt-1.5 text-4xl font-extrabold uppercase tracking-[-.03em] text-white">
        Sign Up
      </h1>
      <RegisterForm />
    </>
  );
}

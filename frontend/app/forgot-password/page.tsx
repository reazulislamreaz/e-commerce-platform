'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '@/components/common/form-field';

const schema = z.object({ email: z.email() });
type Input = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Input>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async () => {
    await new Promise((r) => setTimeout(r, 500));
    setSent(true);
  });

  return (
    <main id="main-content" className="flex flex-1 items-center justify-center bg-black px-5 py-16">
      <div className="w-full max-w-md rounded-[4px] border border-[#2d2a27] bg-[#111110] p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          Account
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-white">Forgot Password</h1>
        <p className="mt-2 text-sm text-[#b5b0a8]">
          Enter your email and we&apos;ll send reset instructions.
        </p>
        {sent ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-[4px] border border-[#2d4a2d] bg-[#102010] px-3.5 py-3 text-sm text-[#8fbf8f]">
              If an account exists for that email, reset instructions have been sent. Check your
              inbox and spam folder.
            </p>
            <Link href="/reset-password" className="block text-sm text-[#e3bb78] hover:text-[#eec98a]">
              Have a reset code? Continue →
            </Link>
            <Link href="/login" className="block text-sm text-[#b5b0a8] hover:text-[#e3bb78]">
              ← Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <FormField
              label="Email"
              type="email"
              placeholder="Email"
              error={errors.email?.message}
              {...register('email')}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-[4px] bg-[#e5bd78] py-3 text-xs font-bold uppercase tracking-[.08em] text-[#18120b] hover:bg-[#eec98a] disabled:opacity-50"
            >
              {isSubmitting ? 'Sending…' : 'Send Reset Link'}
            </button>
            <Link href="/login" className="block text-center text-sm text-[#b5b0a8] hover:text-[#e3bb78]">
              ← Back to login
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}

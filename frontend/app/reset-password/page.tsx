'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '@/components/common/form-field';

const schema = z
  .object({
    code: z.string().min(4, 'Enter the reset code').max(12),
    password: z
      .string()
      .min(12)
      .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Include upper, lower, and a digit'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type Input = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Input>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async () => {
    await new Promise((r) => setTimeout(r, 500));
    setDone(true);
  });

  return (
    <main id="main-content" className="flex flex-1 items-center justify-center bg-black px-5 py-16">
      <div className="w-full max-w-md rounded-[4px] border border-[#2d2a27] bg-[#111110] p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          Account
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-white">Reset Password</h1>
        {done ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-[4px] border border-[#2d4a2d] bg-[#102010] px-3.5 py-3 text-sm text-[#8fbf8f]">
              Your password has been updated. You can now sign in.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-[4px] bg-[#e5bd78] px-5 py-3 text-xs font-bold uppercase text-[#18120b]"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <FormField
              label="Reset code"
              placeholder="Code from email"
              error={errors.code?.message}
              {...register('code')}
            />
            <FormField
              label="New password"
              type="password"
              error={errors.password?.message}
              {...register('password')}
            />
            <FormField
              label="Confirm password"
              type="password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-[4px] bg-[#e5bd78] py-3 text-xs font-bold uppercase tracking-[.08em] text-[#18120b] hover:bg-[#eec98a] disabled:opacity-50"
            >
              {isSubmitting ? 'Updating…' : 'Reset Password'}
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

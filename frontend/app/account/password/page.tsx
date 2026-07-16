'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '@/components/common/form-field';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Include upper, lower, and a digit'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type Input = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Input>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async () => {
    // Backend password-change endpoint will replace this local confirmation.
    await new Promise((r) => setTimeout(r, 400));
    setDone(true);
    reset();
  });

  return (
    <div className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5">
      <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">
        Change Password
      </h2>
      <form onSubmit={onSubmit} className="mt-5 max-w-md space-y-4">
        <FormField
          label="Current password"
          type="password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <FormField
          label="New password"
          type="password"
          error={errors.password?.message}
          {...register('password')}
        />
        <FormField
          label="Confirm new password"
          type="password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        {done && (
          <p className="text-sm text-[#8fbf8f]">
            Password update requested. You will receive a confirmation email when the API is
            connected.
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-5 py-3 text-[11px] font-bold uppercase text-[#18120b] disabled:opacity-50"
        >
          Update Password
        </button>
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '@/components/common/form-field';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { profileUpdated } from '@/store/slices/auth-slice';

const schema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.email(),
  phone: z.string().max(20).optional(),
});

type Input = z.infer<typeof schema>;

export default function ProfilePage() {
  const user = useAppSelector((s) => s.auth.user)!;
  const dispatch = useAppDispatch();
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email,
      phone: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    dispatch(
      profileUpdated({
        firstName: values.firstName,
        lastName: values.lastName,
      }),
    );
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  });

  return (
    <div className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5">
      <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">Edit Profile</h2>
      <form onSubmit={onSubmit} className="mt-5 grid max-w-xl gap-4 sm:grid-cols-2">
        <FormField label="First name" error={errors.firstName?.message} {...register('firstName')} />
        <FormField label="Last name" error={errors.lastName?.message} {...register('lastName')} />
        <div className="sm:col-span-2">
          <FormField
            label="Email"
            type="email"
            disabled
            hint="Email cannot be changed here."
            error={errors.email?.message}
            {...register('email')}
          />
        </div>
        <div className="sm:col-span-2">
          <FormField label="Phone (optional)" {...register('phone')} />
        </div>
        {saved && <p className="sm:col-span-2 text-sm text-[#8fbf8f]">Profile updated.</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-5 py-3 text-[11px] font-bold uppercase text-[#18120b] disabled:opacity-50 sm:col-span-2 sm:w-fit"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}

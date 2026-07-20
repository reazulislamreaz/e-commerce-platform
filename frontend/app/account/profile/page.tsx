'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { FormField } from '@/components/common/form-field';
import { useUpdateProfile } from '@/features/auth/hooks';
import { profileSchema, type ProfileInput } from '@/features/auth/schemas';
import { useAppSelector } from '@/store/hooks';

export default function ProfilePage() {
  const user = useAppSelector((s) => s.auth.user)!;
  const updateProfile = useUpdateProfile();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email,
      phone: user.phone ?? '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await updateProfile
      .mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        // Backend keeps the existing phone when the field is omitted.
        ...(values.phone ? { phone: values.phone } : {}),
      })
      .catch(() => undefined);
  });

  const serverError =
    updateProfile.isError &&
    (axios.isAxiosError<{ message?: string }>(updateProfile.error) &&
    updateProfile.error.response?.status === 409
      ? (updateProfile.error.response.data.message ?? 'Phone number is already registered.')
      : 'Something went wrong. Please try again.');

  return (
    <div className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5">
      <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">Edit Profile</h2>
      <form onSubmit={onSubmit} className="mt-5 grid max-w-xl gap-4 sm:grid-cols-2">
        <FormField
          label="First name"
          error={errors.firstName?.message}
          {...register('firstName')}
        />
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
          <FormField
            label="Phone"
            type="tel"
            autoComplete="tel"
            placeholder="01712345678"
            error={errors.phone?.message}
            {...register('phone')}
          />
        </div>
        {serverError && (
          <p role="alert" className="sm:col-span-2 text-sm text-red-300">
            {serverError}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-5 py-3 text-[11px] font-bold uppercase text-[#18120b] disabled:opacity-50 sm:col-span-2 sm:w-fit"
        >
          {isSubmitting ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '@/components/common/form-field';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';
import {
  accountRepository,
  useAccountAddresses,
  type SavedAddress,
} from '@/features/account';

const schema = z.object({
  label: z.string().min(1).max(40),
  fullName: z.string().min(2).max(80),
  phone: z.string().min(10).max(20),
  line1: z.string().min(3).max(120),
  line2: z.string().max(120).optional(),
  city: z.string().min(2).max(80),
  district: z.string().min(2).max(80),
  postalCode: z.string().min(3).max(20),
  isDefault: z.boolean().optional(),
});

type Input = z.infer<typeof schema>;

export default function AddressesPage() {
  const user = useAppSelector(selectAuthUser)!;
  const { data: addresses, setData: setAddresses, loading } = useAccountAddresses(user.id);
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { label: 'Home', city: 'Dhaka', district: 'Dhaka', isDefault: false },
  });

  const persist = async (next: SavedAddress[]) => {
    setAddresses(next);
    await accountRepository.saveAddresses(user.id, next);
  };

  const onSubmit = handleSubmit(async (values) => {
    const next: SavedAddress = {
      id: `addr-${crypto.randomUUID()}`,
      ...values,
      line2: values.line2,
      country: 'Bangladesh',
      isDefault: Boolean(values.isDefault) || addresses.length === 0,
      type: 'shipping',
    };
    let list = [...addresses, next];
    if (next.isDefault) {
      list = list.map((a) => ({ ...a, isDefault: a.id === next.id }));
    }
    await persist(list);
    reset({ label: 'Home', city: 'Dhaka', district: 'Dhaka', isDefault: false });
    setOpen(false);
  });

  if (loading) {
    return <p className="text-sm text-[#b5b0a8]">Loading addresses…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">
          Saved Addresses
        </h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-3 py-2 text-[10px] font-bold uppercase text-[#18120b]"
        >
          {open ? 'Cancel' : 'Add Address'}
        </button>
      </div>

      {open && (
        <form
          onSubmit={onSubmit}
          className="grid gap-3 rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5 sm:grid-cols-2"
        >
          <FormField label="Label" error={errors.label?.message} {...register('label')} />
          <FormField label="Full name" error={errors.fullName?.message} {...register('fullName')} />
          <FormField label="Phone" error={errors.phone?.message} {...register('phone')} />
          <div className="sm:col-span-2">
            <FormField label="Address line 1" error={errors.line1?.message} {...register('line1')} />
          </div>
          <div className="sm:col-span-2">
            <FormField label="Address line 2" {...register('line2')} />
          </div>
          <FormField label="City" error={errors.city?.message} {...register('city')} />
          <FormField label="District" error={errors.district?.message} {...register('district')} />
          <FormField
            label="Postal code"
            error={errors.postalCode?.message}
            {...register('postalCode')}
          />
          <label className="flex items-center gap-2 text-sm text-[#e9e5de] sm:col-span-2">
            <input type="checkbox" {...register('isDefault')} className="accent-[#e5bd79]" />
            Set as default
          </label>
          <button
            type="submit"
            className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-4 py-2.5 text-[10px] font-bold uppercase text-[#18120b] sm:w-fit"
          >
            Save Address
          </button>
        </form>
      )}

      {addresses.length === 0 ? (
        <p className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5 text-sm text-[#b5b0a8]">
          No saved addresses yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-4 text-sm text-[#e9e5de]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">
                    {address.label}
                    {address.isDefault && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-[#e3bb78]">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="mt-1">{address.fullName}</p>
                  <p className="text-[#b5b0a8]">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ''}
                  </p>
                  <p className="text-[#b5b0a8]">
                    {address.city}, {address.district} {address.postalCode}
                  </p>
                  <p className="text-[#b5b0a8]">{address.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => persist(addresses.filter((a) => a.id !== address.id))}
                  className="text-[11px] uppercase text-red-300 hover:text-red-200"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

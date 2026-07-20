'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '@/components/common/form-field';
import { toast } from '@/lib/toast';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';
import { AccountPanelSkeleton } from '@/components/common/skeleton';
import { accountRepository, useAccountAddresses, type SavedAddress } from '@/features/account';

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
  const {
    data: addresses,
    setData: setAddresses,
    loading,
    error: loadError,
  } = useAccountAddresses(user.id);
  const [mode, setMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { label: 'Home', city: 'Dhaka', district: 'Dhaka', isDefault: false },
  });

  function openCreate() {
    setEditingId(null);
    setActionError(null);
    reset({ label: 'Home', city: 'Dhaka', district: 'Dhaka', isDefault: false, line2: '' });
    setMode('create');
  }

  function openEdit(address: SavedAddress) {
    setEditingId(address.id);
    setActionError(null);
    reset({
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      district: address.district,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
    });
    setMode('edit');
  }

  function closeForm() {
    setMode('closed');
    setEditingId(null);
    setActionError(null);
  }

  const onSubmit = handleSubmit(async (values) => {
    setActionError(null);
    try {
      if (mode === 'edit' && editingId) {
        const updated = await accountRepository.updateAddress(editingId, {
          ...values,
          line2: values.line2,
          isDefault: Boolean(values.isDefault),
          type: 'shipping',
        });
        setAddresses(
          addresses.map((address) => {
            if (address.id === updated.id) return updated;
            if (updated.isDefault) return { ...address, isDefault: false };
            return address;
          }),
        );
        toast.success('Address updated.', { dedupeKey: 'address:update' });
      } else {
        const created = await accountRepository.createAddress({
          ...values,
          line2: values.line2,
          isDefault: Boolean(values.isDefault) || addresses.length === 0,
          type: 'shipping',
        });
        setAddresses(
          created.isDefault
            ? [...addresses.map((a) => ({ ...a, isDefault: false })), created]
            : [...addresses, created],
        );
        toast.success('Address saved.', { dedupeKey: 'address:create' });
      }
      closeForm();
    } catch {
      const message = 'Could not save address. Please check the details and try again.';
      setActionError(message);
      toast.error(message, { dedupeKey: 'address:save-error' });
    }
  });

  async function onSetDefault(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      const updated = await accountRepository.setDefaultAddress(id);
      setAddresses(
        addresses.map((address) => ({
          ...address,
          isDefault: address.id === updated.id,
        })),
      );
      toast.success('Default address updated.', { dedupeKey: 'address:default' });
    } catch {
      const message = 'Could not update the default address.';
      setActionError(message);
      toast.error(message, { dedupeKey: 'address:default-error' });
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await accountRepository.deleteAddress(id);
      const remaining = addresses.filter((a) => a.id !== id);
      setAddresses(remaining);
      if (editingId === id) closeForm();
      toast.success('Address removed.', { dedupeKey: 'address:remove' });
    } catch {
      const message = 'Could not remove address.';
      setActionError(message);
      toast.error(message, { dedupeKey: 'address:remove-error' });
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <AccountPanelSkeleton />;
  }

  if (loadError) {
    return (
      <p
        role="alert"
        className="rounded-[4px] border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200"
      >
        Could not load addresses. Please refresh and try again.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">
          Saved Addresses
        </h2>
        <button
          type="button"
          onClick={() => (mode === 'closed' ? openCreate() : closeForm())}
          className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-3 py-2 text-[10px] font-bold uppercase text-[#18120b]"
        >
          {mode === 'closed' ? 'Add Address' : 'Cancel'}
        </button>
      </div>

      {actionError ? (
        <p
          role="alert"
          className="rounded-[4px] border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200"
        >
          {actionError}
        </p>
      ) : null}

      {mode !== 'closed' && (
        <form
          onSubmit={onSubmit}
          className="grid gap-3 rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5 sm:grid-cols-2"
        >
          <p className="sm:col-span-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#e0bd7d]">
            {mode === 'edit' ? 'Edit address' : 'New address'}
          </p>
          <FormField label="Label" error={errors.label?.message} {...register('label')} />
          <FormField label="Full name" error={errors.fullName?.message} {...register('fullName')} />
          <FormField label="Phone" error={errors.phone?.message} {...register('phone')} />
          <div className="sm:col-span-2">
            <FormField
              label="Address line 1"
              error={errors.line1?.message}
              {...register('line1')}
            />
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
            Set as default shipping address
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-4 py-2.5 text-[10px] font-bold uppercase text-[#18120b] disabled:opacity-50 sm:w-fit"
          >
            {isSubmitting ? 'Saving…' : mode === 'edit' ? 'Update Address' : 'Save Address'}
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
              <div className="flex flex-wrap items-start justify-between gap-3">
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
                <div className="flex flex-wrap gap-2">
                  {!address.isDefault ? (
                    <button
                      type="button"
                      disabled={busyId === address.id}
                      onClick={() => void onSetDefault(address.id)}
                      className="text-[11px] uppercase tracking-wide text-[#e3bb78] hover:text-[#eec98a] disabled:opacity-50"
                    >
                      Set default
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === address.id}
                    onClick={() => openEdit(address)}
                    className="text-[11px] uppercase tracking-wide text-[#d8d4cd] hover:text-white disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busyId === address.id}
                    onClick={() => void onRemove(address.id)}
                    className="text-[11px] uppercase text-red-300 hover:text-red-200 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

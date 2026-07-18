'use client';

import axios from 'axios';
import { useState, type FormEvent } from 'react';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminInput,
  AdminPanel,
  AdminSelect,
  AdminTable,
  AdminTd,
  AdminTextarea,
  AdminTh,
  StatusPill,
} from '@/components/admin/admin-ui';
import { adminApi, useAdminCoupons, useAdminMutation } from '@/features/admin';
import { formatTaka } from '@/lib/currency';

function mutationErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function toDatetimeLocalValue(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminCouponsPage() {
  const couponsQuery = useAdminCoupons();
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardType, setRewardType] = useState<'percent' | 'fixed' | 'free_shipping'>('percent');
  const [value, setValue] = useState('10');
  const [minOrderTaka, setMinOrderTaka] = useState('1500');
  const [startsAt, setStartsAt] = useState(() => toDatetimeLocalValue(new Date().toISOString()));
  const [endsAt, setEndsAt] = useState('');
  const [maxRedemptionsPerUser, setMaxRedemptionsPerUser] = useState('1');

  const createMutation = useAdminMutation(adminApi.createCoupon);
  const deactivateMutation = useAdminMutation((id: string) => adminApi.deactivateCoupon(id));

  const busy = createMutation.isPending || deactivateMutation.isPending;
  const coupons = couponsQuery.data ?? [];

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setActionError(null);
    setSuccess(null);

    if (!code.trim() || !title.trim() || !description.trim() || !startsAt) {
      setActionError('Code, title, description, and start date are required.');
      return;
    }

    const minOrder = Number(minOrderTaka);
    const maxPerUser = Number(maxRedemptionsPerUser);
    if (!Number.isFinite(minOrder) || minOrder < 0) {
      setActionError('Minimum order must be a non-negative number.');
      return;
    }
    if (!Number.isInteger(maxPerUser) || maxPerUser < 1) {
      setActionError('Max redemptions per user must be at least 1.');
      return;
    }

    const body: Record<string, unknown> = {
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim(),
      rewardType,
      minOrderTaka: minOrder,
      startsAt: new Date(startsAt).toISOString(),
      maxRedemptionsPerUser: maxPerUser,
    };

    if (rewardType !== 'free_shipping') {
      const parsedValue = Number(value);
      if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        setActionError('Value is required for percent and fixed coupons.');
        return;
      }
      body.value = parsedValue;
    }

    if (endsAt) {
      body.endsAt = new Date(endsAt).toISOString();
    }

    try {
      await createMutation.mutateAsync(body);
      setSuccess(`Coupon ${code.trim().toUpperCase()} created.`);
      setCode('');
      setTitle('');
      setDescription('');
      setValue('10');
      setMinOrderTaka('1500');
      setEndsAt('');
      setMaxRedemptionsPerUser('1');
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not create coupon.'));
    }
  }

  async function onDeactivate(id: string, couponCode: string) {
    setActionError(null);
    setSuccess(null);
    try {
      await deactivateMutation.mutateAsync(id);
      setSuccess(`Coupon ${couponCode} deactivated.`);
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not deactivate coupon.'));
    }
  }

  return (
    <div className="space-y-5">
      <AdminPanel title="Coupons" description="Active and disabled promotions.">
        {couponsQuery.isError ? <AdminError>Could not load coupons.</AdminError> : null}
        {actionError ? <AdminError>{actionError}</AdminError> : null}
        {success ? (
          <p className="mb-3 rounded-[4px] border border-[#e5bd79]/40 bg-[#1a1815] px-3 py-2 text-sm text-[#e3bb78]">
            {success}
          </p>
        ) : null}

        {couponsQuery.isLoading ? (
          <p className="py-8 text-center text-sm text-[#b5b0a8]">Loading coupons…</p>
        ) : null}

        {!couponsQuery.isLoading && !couponsQuery.isError && coupons.length === 0 ? (
          <AdminEmpty>No coupons yet.</AdminEmpty>
        ) : null}

        {coupons.length > 0 ? (
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>Code</AdminTh>
                <AdminTh>Title</AdminTh>
                <AdminTh>Reward</AdminTh>
                <AdminTh>Min order</AdminTh>
                <AdminTh>Window</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh className="text-right">Action</AdminTh>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <AdminTd>
                    <span className="font-semibold text-white">{coupon.code}</span>
                  </AdminTd>
                  <AdminTd>
                    <span className="text-[#e9e5de]">{coupon.title}</span>
                  </AdminTd>
                  <AdminTd>
                    <span className="text-[#e3bb78]">
                      {coupon.rewardType === 'free_shipping'
                        ? 'Free shipping'
                        : coupon.rewardType === 'percent'
                          ? `${coupon.value ?? 0}%`
                          : formatTaka(coupon.value ?? 0)}
                    </span>
                  </AdminTd>
                  <AdminTd>{formatTaka(coupon.minOrderTaka)}</AdminTd>
                  <AdminTd>
                    <span className="text-xs text-[#b5b0a8]">
                      {new Date(coupon.startsAt).toLocaleDateString()}
                      {coupon.endsAt
                        ? ` – ${new Date(coupon.endsAt).toLocaleDateString()}`
                        : ' – open'}
                    </span>
                  </AdminTd>
                  <AdminTd>
                    <StatusPill>{coupon.status}</StatusPill>
                  </AdminTd>
                  <AdminTd className="text-right">
                    {coupon.status === 'ACTIVE' ? (
                      <AdminButton
                        type="button"
                        variant="danger"
                        disabled={busy}
                        onClick={() => void onDeactivate(coupon.id, coupon.code)}
                      >
                        Deactivate
                      </AdminButton>
                    ) : (
                      <span className="text-xs text-[#8b867d]">—</span>
                    )}
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : null}
      </AdminPanel>

      <AdminPanel title="Create coupon" description="New codes are uppercase and unique.">
        <form onSubmit={(event) => void onCreate(event)} className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Code
            </span>
            <AdminInput
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="ELEVATE10"
              autoComplete="off"
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Title
            </span>
            <AdminInput
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Description
            </span>
            <AdminTextarea
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Reward type
            </span>
            <AdminSelect
              value={rewardType}
              onChange={(event) =>
                setRewardType(event.target.value as 'percent' | 'fixed' | 'free_shipping')
              }
              disabled={busy}
            >
              <option value="percent">Percent</option>
              <option value="fixed">Fixed</option>
              <option value="free_shipping">Free shipping</option>
            </AdminSelect>
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Value
            </span>
            <AdminInput
              type="number"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              disabled={busy || rewardType === 'free_shipping'}
              placeholder={rewardType === 'percent' ? '10' : '500'}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Min order (৳)
            </span>
            <AdminInput
              type="number"
              min={0}
              value={minOrderTaka}
              onChange={(event) => setMinOrderTaka(event.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Max per user
            </span>
            <AdminInput
              type="number"
              min={1}
              step={1}
              value={maxRedemptionsPerUser}
              onChange={(event) => setMaxRedemptionsPerUser(event.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Starts at
            </span>
            <AdminInput
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Ends at (optional)
            </span>
            <AdminInput
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              disabled={busy}
            />
          </label>
          <div className="sm:col-span-2">
            <AdminButton type="submit" disabled={busy}>
              {createMutation.isPending ? 'Creating…' : 'Create coupon'}
            </AdminButton>
          </div>
        </form>
      </AdminPanel>
    </div>
  );
}

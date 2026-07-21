'use client';

import { toast } from '@/lib/toast';
import { useMemo, useState, type FormEvent } from 'react';
import { AdminTableSkeleton } from '@/components/common/skeleton';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminInput,
  AdminPageHeader,
  AdminPanel,
  AdminSelect,
  AdminTable,
  AdminTd,
  AdminTextarea,
  AdminTh,
  StatusPill,
} from '@/components/admin/admin-ui';
import {
  adminApi,
  adminKeys,
  useAdminCoupons,
  useAdminMutation,
  useCouponRedemptions,
} from '@/features/admin';
import type { AdminCoupon } from '@/features/admin/types';
import { mutationErrorMessage } from '@/features/admin/mutation-error';
import { formatTaka } from '@/lib/currency';

function toDatetimeLocalValue(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function CouponRedemptionsPanel({
  couponId,
  couponCode,
}: {
  couponId: string;
  couponCode: string;
}) {
  const [cursor, setCursor] = useState<string | undefined>();
  const [priorRows, setPriorRows] = useState<
    Array<{
      id: string;
      orderId: string;
      userId?: string | null;
      discountTaka: number;
      shippingWaived: boolean;
      createdAt: string;
    }>
  >([]);

  const queryParams = useMemo(
    () => ({
      limit: 20,
      ...(cursor ? { cursor } : {}),
    }),
    [cursor],
  );

  const redemptionsQuery = useCouponRedemptions(couponId, queryParams);
  const pageRows = redemptionsQuery.data?.data ?? [];
  const rows = cursor ? [...priorRows, ...pageRows] : pageRows;
  const nextCursor = redemptionsQuery.data?.meta.nextCursor ?? null;
  const showInitialLoading = redemptionsQuery.isLoading && !cursor && rows.length === 0;

  function loadMore() {
    if (!redemptionsQuery.data?.meta.nextCursor) return;
    setPriorRows(cursor ? [...priorRows, ...pageRows] : pageRows);
    setCursor(redemptionsQuery.data.meta.nextCursor);
  }

  return (
    <AdminPanel
      title={`Redemptions — ${couponCode}`}
      description="Orders that redeemed this coupon. Newest first."
    >
      {redemptionsQuery.isError ? <AdminError>Could not load redemptions.</AdminError> : null}
      {showInitialLoading ? <AdminTableSkeleton /> : null}
      {!showInitialLoading && !redemptionsQuery.isError && rows.length === 0 ? (
        <AdminEmpty>No redemptions yet for this coupon.</AdminEmpty>
      ) : null}
      {rows.length > 0 ? (
        <>
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>When</AdminTh>
                <AdminTh>Order</AdminTh>
                <AdminTh>Customer</AdminTh>
                <AdminTh>Discount</AdminTh>
                <AdminTh>Shipping</AdminTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <AdminTd>
                    <span className="text-[#555555]">
                      {new Date(row.createdAt).toLocaleString()}
                    </span>
                  </AdminTd>
                  <AdminTd>
                    <span className="font-mono text-xs text-[#111111]">
                      {row.orderId.slice(0, 8)}…
                    </span>
                  </AdminTd>
                  <AdminTd>
                    <span className="font-mono text-xs text-[#555555]">
                      {row.userId ? `${row.userId.slice(0, 8)}…` : 'Guest'}
                    </span>
                  </AdminTd>
                  <AdminTd>
                    <span className="text-[#C9A227]">{formatTaka(row.discountTaka)}</span>
                  </AdminTd>
                  <AdminTd>
                    {row.shippingWaived ? (
                      <span className="text-emerald-700">Waived</span>
                    ) : (
                      <span className="text-[#555555]">—</span>
                    )}
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <div className="mt-4 flex justify-center">
            {redemptionsQuery.isFetching && cursor ? (
              <p className="text-sm text-[#555555]">Loading more…</p>
            ) : nextCursor ? (
              <AdminButton type="button" variant="secondary" onClick={loadMore}>
                Load more
              </AdminButton>
            ) : null}
          </div>
        </>
      ) : null}
    </AdminPanel>
  );
}

export default function AdminCouponsPage() {
  const couponsQuery = useAdminCoupons();
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState('');
  const [redemptionsCouponId, setRedemptionsCouponId] = useState<string | null>(null);
  const [redemptionsCode, setRedemptionsCode] = useState('');

  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardType, setRewardType] = useState<'percent' | 'fixed' | 'free_shipping'>('percent');
  const [value, setValue] = useState('10');
  const [minOrderTaka, setMinOrderTaka] = useState('1500');
  const [startsAt, setStartsAt] = useState(() => toDatetimeLocalValue(new Date().toISOString()));
  const [endsAt, setEndsAt] = useState('');
  const [maxRedemptionsPerUser, setMaxRedemptionsPerUser] = useState('1');

  const createMutation = useAdminMutation(adminApi.createCoupon, [adminKeys.coupons()]);
  const updateMutation = useAdminMutation(
    ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      adminApi.updateCoupon(id, body),
    [adminKeys.coupons()],
  );
  const deactivateMutation = useAdminMutation(
    (id: string) => adminApi.deactivateCoupon(id),
    [adminKeys.coupons()],
  );

  const busy = createMutation.isPending || updateMutation.isPending || deactivateMutation.isPending;
  const coupons = couponsQuery.data ?? [];
  const isEditing = editingId !== null;

  function resetForm() {
    setEditingId(null);
    setEditingCode('');
    setCode('');
    setTitle('');
    setDescription('');
    setRewardType('percent');
    setValue('10');
    setMinOrderTaka('1500');
    setStartsAt(toDatetimeLocalValue(new Date().toISOString()));
    setEndsAt('');
    setMaxRedemptionsPerUser('1');
  }

  function startEdit(coupon: AdminCoupon) {
    setEditingId(coupon.id);
    setEditingCode(coupon.code);
    setRedemptionsCouponId(coupon.id);
    setRedemptionsCode(coupon.code);
    setCode(coupon.code);
    setTitle(coupon.title);
    setDescription(coupon.description);
    setRewardType(coupon.rewardType);
    setValue(String(coupon.value ?? (coupon.rewardType === 'percent' ? 10 : 500)));
    setMinOrderTaka(String(coupon.minOrderTaka));
    setStartsAt(toDatetimeLocalValue(coupon.startsAt));
    setEndsAt(toDatetimeLocalValue(coupon.endsAt ?? undefined));
    setMaxRedemptionsPerUser(String(coupon.maxRedemptionsPerUser));
    setActionError(null);
    setSuccess(null);
  }

  function showRedemptions(coupon: AdminCoupon) {
    setRedemptionsCouponId(coupon.id);
    setRedemptionsCode(coupon.code);
  }

  function buildBody(isUpdate: boolean): Record<string, unknown> | null {
    if (!isUpdate && (!code.trim() || !title.trim() || !description.trim() || !startsAt)) {
      setActionError('Code, title, description, and start date are required.');
      return null;
    }
    if (isUpdate && (!title.trim() || !description.trim() || !startsAt)) {
      setActionError('Title, description, and start date are required.');
      return null;
    }

    const minOrder = Number(minOrderTaka);
    const maxPerUser = Number(maxRedemptionsPerUser);
    if (!Number.isFinite(minOrder) || minOrder < 0) {
      setActionError('Minimum order must be a non-negative number.');
      return null;
    }
    if (!Number.isInteger(maxPerUser) || maxPerUser < 1) {
      setActionError('Max redemptions per user must be at least 1.');
      return null;
    }

    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      rewardType,
      minOrderTaka: minOrder,
      startsAt: new Date(startsAt).toISOString(),
      maxRedemptionsPerUser: maxPerUser,
    };

    if (!isUpdate) {
      body.code = code.trim().toUpperCase();
    }

    if (rewardType !== 'free_shipping') {
      const parsedValue = Number(value);
      if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        setActionError('Value is required for percent and fixed coupons.');
        return null;
      }
      body.value = parsedValue;
    }

    body.endsAt = endsAt ? new Date(endsAt).toISOString() : null;

    return body;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setActionError(null);
    setSuccess(null);

    const body = buildBody(isEditing);
    if (!body) return;

    try {
      if (isEditing && editingId) {
        await updateMutation.mutateAsync({ id: editingId, body });
        const message = `Coupon ${editingCode} updated.`;
        setSuccess(message);
        toast.success(message, { dedupeKey: 'admin:coupon-update' });
        resetForm();
      } else {
        await createMutation.mutateAsync(body);
        const message = `Coupon ${code.trim().toUpperCase()} created.`;
        setSuccess(message);
        toast.success(message, { dedupeKey: 'admin:coupon-create' });
        resetForm();
      }
    } catch (error) {
      const message = mutationErrorMessage(
        error,
        isEditing ? 'Could not update coupon.' : 'Could not create coupon.',
      );
      setActionError(message);
      toast.error(message, { dedupeKey: 'admin:coupon-error' });
    }
  }

  async function onDeactivate(id: string, couponCode: string) {
    setActionError(null);
    setSuccess(null);
    try {
      await deactivateMutation.mutateAsync(id);
      const message = `Coupon ${couponCode} deactivated.`;
      setSuccess(message);
      toast.success(message, { dedupeKey: 'admin:coupon-deactivate' });
    } catch (error) {
      const message = mutationErrorMessage(error, 'Could not deactivate coupon.');
      setActionError(message);
      toast.error(message, { dedupeKey: 'admin:coupon-deactivate-error' });
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Coupons" description="Create and manage storefront promotions." />
      <AdminPanel title="All coupons" description="Active and disabled promotions.">
        {couponsQuery.isError ? <AdminError>Could not load coupons.</AdminError> : null}
        {actionError ? <AdminError>{actionError}</AdminError> : null}
        {success ? (
          <p className="mb-3 rounded-[4px] border border-[#C9A227]/40 bg-[#FFFFFF] px-3 py-2 text-sm text-[#C9A227]">
            {success}
          </p>
        ) : null}

        {couponsQuery.isLoading ? <AdminTableSkeleton /> : null}

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
                    <span className="font-semibold text-[#111111]">{coupon.code}</span>
                  </AdminTd>
                  <AdminTd>
                    <span className="text-[#111111]">{coupon.title}</span>
                  </AdminTd>
                  <AdminTd>
                    <span className="text-[#C9A227]">
                      {coupon.rewardType === 'free_shipping'
                        ? 'Free shipping'
                        : coupon.rewardType === 'percent'
                          ? `${coupon.value ?? 0}%`
                          : formatTaka(coupon.value ?? 0)}
                    </span>
                  </AdminTd>
                  <AdminTd>{formatTaka(coupon.minOrderTaka)}</AdminTd>
                  <AdminTd>
                    <span className="text-xs text-[#555555]">
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
                    <div className="flex flex-wrap justify-end gap-2">
                      <AdminButton
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => showRedemptions(coupon)}
                      >
                        Redemptions
                      </AdminButton>
                      <AdminButton
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => startEdit(coupon)}
                      >
                        Edit
                      </AdminButton>
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
                        <span className="self-center text-xs text-[#555555]">—</span>
                      )}
                    </div>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : null}
      </AdminPanel>

      <AdminPanel
        title={isEditing ? 'Edit coupon' : 'Create coupon'}
        description={
          isEditing
            ? `Update rules for ${editingCode}. Code cannot be changed.`
            : 'New codes are uppercase and unique. Global coupons MVP — no product/category scoping yet.'
        }
      >
        <form onSubmit={(event) => void onSubmit(event)} className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Code
            </span>
            <AdminInput
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="ELEVATE10"
              autoComplete="off"
              disabled={busy || isEditing}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Title
            </span>
            <AdminInput
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
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
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
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
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
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
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
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
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
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
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
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
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Ends at (optional)
            </span>
            <AdminInput
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              disabled={busy}
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <AdminButton type="submit" disabled={busy}>
              {isEditing
                ? updateMutation.isPending
                  ? 'Saving…'
                  : 'Save changes'
                : createMutation.isPending
                  ? 'Creating…'
                  : 'Create coupon'}
            </AdminButton>
            {isEditing ? (
              <AdminButton type="button" variant="secondary" disabled={busy} onClick={resetForm}>
                Cancel edit
              </AdminButton>
            ) : null}
          </div>
        </form>
      </AdminPanel>

      {redemptionsCouponId ? (
        <CouponRedemptionsPanel
          key={redemptionsCouponId}
          couponId={redemptionsCouponId}
          couponCode={redemptionsCode}
        />
      ) : null}
    </div>
  );
}

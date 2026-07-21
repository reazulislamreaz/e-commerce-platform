'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { mutationErrorMessage } from '@/features/admin';
import { marketingApi } from '@/features/marketing/api';
import type {
  BannerPlacement,
  BannerStatus,
  MarketingBanner,
  UpsertBannerInput,
} from '@/features/marketing/types';

const bannerKeys = {
  all: ['admin', 'banners'] as const,
};

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoOrUndefined(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

const defaultForm = {
  placement: 'HOME_HERO' as BannerPlacement,
  status: 'ACTIVE' as BannerStatus,
  title: '',
  subtitle: '',
  ctaLabel: 'SHOP NOW',
  ctaHref: '/shop',
  imageUrl: '/images/home/hero.webp',
  mobileImageUrl: '',
  position: '0',
  startsAt: '',
  endsAt: '',
};

export default function AdminBannersPage() {
  const queryClient = useQueryClient();
  const bannersQuery = useQuery({
    queryKey: bannerKeys.all,
    queryFn: () => marketingApi.listAdmin(),
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const createMutation = useMutation({
    mutationFn: (body: UpsertBannerInput) => marketingApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bannerKeys.all }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<UpsertBannerInput> }) =>
      marketingApi.update(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bannerKeys.all }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => marketingApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bannerKeys.all }),
  });

  const busy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const banners = bannersQuery.data ?? [];
  const isEditing = editingId !== null;

  function resetForm() {
    setEditingId(null);
    setForm(defaultForm);
  }

  function startEdit(banner: MarketingBanner) {
    setEditingId(banner.id);
    setForm({
      placement: banner.placement,
      status: banner.status === 'ARCHIVED' ? 'DRAFT' : banner.status,
      title: banner.title,
      subtitle: banner.subtitle ?? '',
      ctaLabel: banner.ctaLabel ?? '',
      ctaHref: banner.ctaHref ?? '',
      imageUrl: banner.imageUrl,
      mobileImageUrl: banner.mobileImageUrl ?? '',
      position: String(banner.position),
      startsAt: toDatetimeLocalValue(banner.startsAt),
      endsAt: toDatetimeLocalValue(banner.endsAt),
    });
    setActionError(null);
    setSuccess(null);
  }

  function buildPayload(): UpsertBannerInput | null {
    if (!form.title.trim() || !form.imageUrl.trim()) {
      setActionError('Title and desktop image URL are required.');
      return null;
    }

    return {
      placement: form.placement,
      status: form.status,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      ctaLabel: form.ctaLabel.trim() || undefined,
      ctaHref: form.ctaHref.trim() || undefined,
      imageUrl: form.imageUrl.trim(),
      mobileImageUrl: form.mobileImageUrl.trim() || undefined,
      position: Number(form.position) || 0,
      startsAt: toIsoOrUndefined(form.startsAt),
      endsAt: form.endsAt.trim() ? toIsoOrUndefined(form.endsAt) : null,
    };
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setActionError(null);
    setSuccess(null);

    const payload = buildPayload();
    if (!payload) return;

    try {
      if (isEditing && editingId) {
        await updateMutation.mutateAsync({ id: editingId, body: payload });
        setSuccess('Banner updated.');
        resetForm();
      } else {
        await createMutation.mutateAsync(payload);
        setSuccess('Banner created.');
        setForm({ ...defaultForm, placement: form.placement, status: form.status });
      }
    } catch (error) {
      setActionError(
        mutationErrorMessage(
          error,
          isEditing ? 'Could not update banner.' : 'Could not create banner.',
        ),
      );
    }
  }

  async function onDelete(id: string) {
    setActionError(null);
    setSuccess(null);
    try {
      await deleteMutation.mutateAsync(id);
      if (editingId === id) resetForm();
      setSuccess('Banner archived.');
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not archive banner.'));
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Banners" description="Manage storefront hero and promo placements." />

      <AdminPanel title="All banners" description="Active, scheduled, and draft creatives.">
        {bannersQuery.isError ? <AdminError>Could not load banners.</AdminError> : null}
        {actionError ? <AdminError>{actionError}</AdminError> : null}
        {success ? (
          <p className="mb-3 rounded-[4px] border border-[#C9A227]/40 bg-[#FFFFFF] px-3 py-2 text-sm text-[#C9A227]">
            {success}
          </p>
        ) : null}

        {bannersQuery.isLoading ? <AdminTableSkeleton /> : null}
        {!bannersQuery.isLoading && !bannersQuery.isError && banners.length === 0 ? (
          <AdminEmpty>No banners yet.</AdminEmpty>
        ) : null}

        {banners.length > 0 ? (
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>Title</AdminTh>
                <AdminTh>Placement</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh>Schedule</AdminTh>
                <AdminTh>Position</AdminTh>
                <AdminTh className="text-right">Actions</AdminTh>
              </tr>
            </thead>
            <tbody>
              {banners.map((banner) => (
                <tr key={banner.id}>
                  <AdminTd>
                    <span className="font-semibold text-[#111111]">{banner.title}</span>
                    {banner.subtitle ? (
                      <span className="mt-1 block text-xs text-[#555555]">{banner.subtitle}</span>
                    ) : null}
                  </AdminTd>
                  <AdminTd>
                    <span className="text-[#111111]">{banner.placement}</span>
                  </AdminTd>
                  <AdminTd>
                    <StatusPill>{banner.status}</StatusPill>
                  </AdminTd>
                  <AdminTd>
                    <span className="text-xs text-[#555555]">
                      {banner.startsAt ? new Date(banner.startsAt).toLocaleDateString() : 'Open'}
                      {banner.endsAt
                        ? ` – ${new Date(banner.endsAt).toLocaleDateString()}`
                        : ' – open'}
                    </span>
                  </AdminTd>
                  <AdminTd>{banner.position}</AdminTd>
                  <AdminTd className="text-right">
                    <div className="flex justify-end gap-2">
                      <AdminButton
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => startEdit(banner)}
                      >
                        Edit
                      </AdminButton>
                      <AdminButton
                        type="button"
                        variant="danger"
                        disabled={busy}
                        onClick={() => void onDelete(banner.id)}
                      >
                        Archive
                      </AdminButton>
                    </div>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : null}
      </AdminPanel>

      <AdminPanel
        title={isEditing ? 'Edit banner' : 'Create banner'}
        description={
          isEditing
            ? 'Update title, imagery, schedule, and placement.'
            : 'New creatives default to HOME_HERO.'
        }
      >
        <form onSubmit={(event) => void onSubmit(event)} className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Placement
            </span>
            <AdminSelect
              value={form.placement}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  placement: event.target.value as BannerPlacement,
                }))
              }
              disabled={busy}
            >
              <option value="HOME_HERO">HOME_HERO</option>
              <option value="HOME_PROMO">HOME_PROMO</option>
              <option value="SHOP_BANNER">SHOP_BANNER</option>
              <option value="SALE_BANNER">SALE_BANNER</option>
            </AdminSelect>
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Status
            </span>
            <AdminSelect
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as BannerStatus,
                }))
              }
              disabled={busy}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="ACTIVE">ACTIVE</option>
            </AdminSelect>
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Title
            </span>
            <AdminInput
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Subtitle
            </span>
            <AdminTextarea
              rows={2}
              value={form.subtitle}
              onChange={(event) =>
                setForm((current) => ({ ...current, subtitle: event.target.value }))
              }
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              CTA label
            </span>
            <AdminInput
              value={form.ctaLabel}
              onChange={(event) =>
                setForm((current) => ({ ...current, ctaLabel: event.target.value }))
              }
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              CTA href
            </span>
            <AdminInput
              value={form.ctaHref}
              onChange={(event) =>
                setForm((current) => ({ ...current, ctaHref: event.target.value }))
              }
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Desktop image URL
            </span>
            <AdminInput
              value={form.imageUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, imageUrl: event.target.value }))
              }
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Mobile image URL (optional)
            </span>
            <AdminInput
              value={form.mobileImageUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, mobileImageUrl: event.target.value }))
              }
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Position
            </span>
            <AdminInput
              type="number"
              min={0}
              value={form.position}
              onChange={(event) =>
                setForm((current) => ({ ...current, position: event.target.value }))
              }
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Starts at (optional)
            </span>
            <AdminInput
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, startsAt: event.target.value }))
              }
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Ends at (optional)
            </span>
            <AdminInput
              type="datetime-local"
              value={form.endsAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, endsAt: event.target.value }))
              }
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
                  : 'Create banner'}
            </AdminButton>
            {isEditing ? (
              <AdminButton type="button" variant="secondary" disabled={busy} onClick={resetForm}>
                Cancel edit
              </AdminButton>
            ) : null}
          </div>
        </form>
      </AdminPanel>
    </div>
  );
}

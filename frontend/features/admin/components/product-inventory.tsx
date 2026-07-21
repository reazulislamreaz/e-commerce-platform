'use client';

import { useMemo, useState, type FormEvent } from 'react';
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
} from '@/components/admin/admin-ui';
import { adminApi } from '../api';
import { adminKeys, useAdminMutation, useInventoryLocations } from '../hooks';
import { mutationErrorMessage } from '../mutation-error';
import type { AdminProductDetail, InventoryBalance } from '../types';

type ProductInventoryProps = {
  variants: AdminProductDetail['variants'];
  balances: InventoryBalance[];
  loading: boolean;
  error: boolean;
};

export function ProductInventory({ variants, balances, loading, error }: ProductInventoryProps) {
  const locations = useInventoryLocations();
  const adjust = useAdminMutation(adminApi.adjustInventory, [adminKeys.inventoryRoot()]);
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? '');
  const [locationId, setLocationId] = useState('');
  // Fall back to the first variant when the selected one no longer exists.
  const variantId = variants.some((variant) => variant.id === selectedVariantId)
    ? selectedVariantId
    : (variants[0]?.id ?? '');
  const [quantityDelta, setQuantityDelta] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedBalance = useMemo(
    () =>
      balances.find(
        (balance) => balance.variantId === variantId && balance.locationId === locationId,
      ),
    [balances, locationId, variantId],
  );

  async function onAdjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    const delta = Number(quantityDelta);

    if (!variantId || !locationId) {
      setFormError('Choose a variant and location.');
      return;
    }
    if (!Number.isInteger(delta) || delta === 0) {
      setFormError('Quantity delta must be a non-zero whole number.');
      return;
    }
    if (!selectedBalance && delta < 0) {
      setFormError('Stock must be added before it can be removed.');
      return;
    }
    if (selectedBalance && delta < -selectedBalance.available) {
      setFormError(`You can remove at most ${selectedBalance.available} available units.`);
      return;
    }

    try {
      await adjust.mutateAsync({
        variantId,
        locationId,
        quantityDelta: delta,
        idempotencyKey: crypto.randomUUID(),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(selectedBalance ? { expectedVersion: selectedBalance.version } : {}),
      });
      setSuccess('Inventory adjusted.');
      setQuantityDelta('');
      setNote('');
    } catch (requestError) {
      setFormError(
        mutationErrorMessage(requestError, 'Could not adjust inventory. Please try again.'),
      );
    }
  }

  return (
    <AdminPanel
      title="Inventory"
      description="Review stock by variant and apply signed adjustments at an inventory location."
    >
      {error || locations.isError ? (
        <AdminError>Could not load product inventory.</AdminError>
      ) : null}
      {loading ? <p className="text-sm text-[#b5b0a8]">Loading inventory…</p> : null}
      {!loading && !error && balances.length === 0 ? (
        <AdminEmpty>No stock has been added for these variants.</AdminEmpty>
      ) : null}
      {balances.length > 0 ? (
        <AdminTable>
          <thead>
            <tr>
              <AdminTh>SKU</AdminTh>
              <AdminTh>Location</AdminTh>
              <AdminTh>On hand</AdminTh>
              <AdminTh>Reserved</AdminTh>
              <AdminTh>Available</AdminTh>
            </tr>
          </thead>
          <tbody>
            {balances.map((balance) => (
              <tr key={balance.id}>
                <AdminTd>{balance.variantSku}</AdminTd>
                <AdminTd>{balance.locationCode}</AdminTd>
                <AdminTd>{balance.onHand}</AdminTd>
                <AdminTd>{balance.reserved}</AdminTd>
                <AdminTd>
                  <span className="text-[#e3bb78]">{balance.available}</span>
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : null}

      <form
        onSubmit={(event) => void onAdjust(event)}
        className="mt-5 grid gap-3 border-t border-[#2d2a27] pt-5 sm:grid-cols-2"
      >
        <label className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
            Variant
          </span>
          <AdminSelect
            value={variantId}
            onChange={(event) => setSelectedVariantId(event.target.value)}
            disabled={adjust.isPending}
          >
            <option value="">Select variant</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.sku} — {variant.size} / {variant.color}
              </option>
            ))}
          </AdminSelect>
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
            Location
          </span>
          <AdminSelect
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            disabled={adjust.isPending || locations.isLoading}
          >
            <option value="">Select location</option>
            {locations.data
              ?.filter((location) => location.isActive)
              .map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code} — {location.name}
                </option>
              ))}
          </AdminSelect>
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
            Quantity delta
          </span>
          <AdminInput
            type="number"
            step="1"
            value={quantityDelta}
            onChange={(event) => setQuantityDelta(event.target.value)}
            placeholder="Use + to add or − to remove"
            disabled={adjust.isPending}
          />
        </label>
        <div className="rounded-lg border border-[#2d2a27] px-3.5 py-2.5 text-xs text-[#b5b0a8]">
          {selectedBalance ? (
            <>
              Available:{' '}
              <span className="font-semibold text-white">{selectedBalance.available}</span>
              {' · '}Version: {selectedBalance.version}
            </>
          ) : (
            'No balance exists here. Submit a positive adjustment to create one.'
          )}
        </div>
        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
            Note (optional)
          </span>
          <AdminTextarea
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={adjust.isPending}
          />
        </label>
        {formError ? (
          <div className="sm:col-span-2">
            <AdminError>{formError}</AdminError>
          </div>
        ) : null}
        {success ? (
          <p className="rounded-[4px] border border-[#e5bd79]/40 bg-[#1a1815] px-3 py-2 text-sm text-[#e3bb78] sm:col-span-2">
            {success}
          </p>
        ) : null}
        <div className="sm:col-span-2">
          <AdminButton type="submit" loading={adjust.isPending}>
            Adjust stock
          </AdminButton>
        </div>
      </form>
    </AdminPanel>
  );
}

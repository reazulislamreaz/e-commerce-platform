'use client';

import axios from 'axios';
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
} from '@/components/admin/admin-ui';
import {
  adminApi,
  adminKeys,
  useAdminMutation,
  useInventoryBalances,
  useInventoryLocations,
  type InventoryBalance,
} from '@/features/admin';

function mutationErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function InventoryBalancesPanel({
  locationId,
  setLocationId,
  locations,
  locationsError,
  onFillBalance,
}: {
  locationId: string;
  setLocationId: (value: string) => void;
  locations: Array<{ id: string; code: string; name: string }>;
  locationsError: boolean;
  onFillBalance: (balance: InventoryBalance) => void;
}) {
  const [cursor, setCursor] = useState<string | undefined>();
  const [priorRows, setPriorRows] = useState<InventoryBalance[]>([]);

  const queryParams = useMemo(
    () => ({
      limit: 20,
      ...(locationId ? { locationId } : {}),
      ...(cursor ? { cursor } : {}),
    }),
    [locationId, cursor],
  );

  const balancesQuery = useInventoryBalances(queryParams);
  const pageRows = balancesQuery.data?.data ?? [];
  const rows = cursor ? [...priorRows, ...pageRows] : pageRows;
  const nextCursor = balancesQuery.data?.meta.nextCursor ?? null;
  const showInitialLoading = balancesQuery.isLoading && !cursor && rows.length === 0;

  function loadMore() {
    if (!balancesQuery.data?.meta.nextCursor) return;
    setPriorRows(cursor ? [...priorRows, ...pageRows] : pageRows);
    setCursor(balancesQuery.data.meta.nextCursor);
  }

  return (
    <AdminPanel
      title="Inventory balances"
      description="On-hand stock by variant and location. Click a row to prefill the adjust form."
    >
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <label className="block min-w-[200px] flex-1 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
            Location
          </span>
          <AdminSelect value={locationId} onChange={(event) => setLocationId(event.target.value)}>
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.code} — {loc.name}
              </option>
            ))}
          </AdminSelect>
        </label>
      </div>

      {locationsError || balancesQuery.isError ? (
        <AdminError>Could not load inventory.</AdminError>
      ) : null}

      {showInitialLoading ? (
        <AdminTableSkeleton />
      ) : null}

      {!showInitialLoading && !balancesQuery.isError && rows.length === 0 ? (
        <AdminEmpty>No inventory balances found.</AdminEmpty>
      ) : null}

      {rows.length > 0 ? (
        <>
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>Product / SKU</AdminTh>
                <AdminTh>Variant</AdminTh>
                <AdminTh>Location</AdminTh>
                <AdminTh>On hand</AdminTh>
                <AdminTh>Reserved</AdminTh>
                <AdminTh>Available</AdminTh>
                <AdminTh>Version</AdminTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((balance) => (
                <tr
                  key={balance.id}
                  className="cursor-pointer hover:bg-[#1a1815]"
                  onClick={() => onFillBalance(balance)}
                >
                  <AdminTd>
                    <span className="font-semibold text-white">{balance.variantSku}</span>
                    <p className="font-mono text-xs text-[#8b867d]">
                      {balance.variantId.slice(0, 8)}…
                    </p>
                  </AdminTd>
                  <AdminTd>
                    <span className="font-mono text-xs text-[#b5b0a8]">{balance.variantId}</span>
                  </AdminTd>
                  <AdminTd>
                    <span className="text-[#e9e5de]">{balance.locationCode}</span>
                  </AdminTd>
                  <AdminTd>{balance.onHand}</AdminTd>
                  <AdminTd>{balance.reserved}</AdminTd>
                  <AdminTd>
                    <span className="text-[#e3bb78]">{balance.available}</span>
                  </AdminTd>
                  <AdminTd>
                    <span className="text-[#b5b0a8]">{balance.version}</span>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>

          <div className="mt-4 flex justify-center">
            {balancesQuery.isFetching && cursor ? (
              <p className="text-sm text-[#b5b0a8]">Loading more…</p>
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

export default function AdminInventoryPage() {
  const locationsQuery = useInventoryLocations();
  const [locationId, setLocationId] = useState('');

  const [variantId, setVariantId] = useState('');
  const [adjustLocationId, setAdjustLocationId] = useState('');
  const [quantityDelta, setQuantityDelta] = useState('0');
  const [expectedVersion, setExpectedVersion] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const adjustMutation = useAdminMutation(adminApi.adjustInventory, [adminKeys.inventoryRoot()]);
  const locations = locationsQuery.data ?? [];

  async function onAdjust(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);

    const delta = Number(quantityDelta);
    if (!variantId.trim() || !adjustLocationId) {
      setFormError('Variant ID and location are required.');
      return;
    }
    if (!Number.isFinite(delta) || delta === 0) {
      setFormError('Quantity delta must be a non-zero number.');
      return;
    }

    const versionRaw = expectedVersion.trim();
    const version = versionRaw === '' ? undefined : Number(versionRaw);
    if (versionRaw !== '' && (!Number.isInteger(version) || (version ?? 0) < 0)) {
      setFormError('Expected version must be a non-negative integer.');
      return;
    }

    try {
      await adjustMutation.mutateAsync({
        variantId: variantId.trim(),
        locationId: adjustLocationId,
        quantityDelta: delta,
        idempotencyKey: crypto.randomUUID(),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(version != null ? { expectedVersion: version } : {}),
      });
      setSuccess('Inventory adjusted.');
      setQuantityDelta('0');
      setNote('');
      setExpectedVersion('');
    } catch (error) {
      setFormError(mutationErrorMessage(error, 'Could not adjust inventory.'));
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Inventory"
        description="Track stock balances and record adjustments."
      />
      <InventoryBalancesPanel
        key={locationId || 'all'}
        locationId={locationId}
        setLocationId={setLocationId}
        locations={locations}
        locationsError={locationsQuery.isError}
        onFillBalance={(balance) => {
          setVariantId(balance.variantId);
          setAdjustLocationId(balance.locationId);
          setExpectedVersion(String(balance.version));
        }}
      />

      <AdminPanel
        title="Adjust inventory"
        description="Apply a signed quantity delta. A fresh idempotency key is generated on each submit."
      >
        {formError ? <AdminError>{formError}</AdminError> : null}
        {success ? (
          <p className="mb-3 rounded-[4px] border border-[#e5bd79]/40 bg-[#1a1815] px-3 py-2 text-sm text-[#e3bb78]">
            {success}
          </p>
        ) : null}

        <form onSubmit={(event) => void onAdjust(event)} className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Variant ID
            </span>
            <AdminInput
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
              placeholder="UUID"
              autoComplete="off"
              disabled={adjustMutation.isPending}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Location
            </span>
            <AdminSelect
              value={adjustLocationId}
              onChange={(event) => setAdjustLocationId(event.target.value)}
              disabled={adjustMutation.isPending}
            >
              <option value="">Select location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} — {loc.name}
                </option>
              ))}
            </AdminSelect>
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Quantity delta
            </span>
            <AdminInput
              type="number"
              value={quantityDelta}
              onChange={(event) => setQuantityDelta(event.target.value)}
              disabled={adjustMutation.isPending}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Expected version (optional)
            </span>
            <AdminInput
              type="number"
              min={0}
              step={1}
              value={expectedVersion}
              onChange={(event) => setExpectedVersion(event.target.value)}
              placeholder="Optimistic lock"
              disabled={adjustMutation.isPending}
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Note (optional)
            </span>
            <AdminTextarea
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={adjustMutation.isPending}
            />
          </label>
          <div>
            <AdminButton type="submit" disabled={adjustMutation.isPending}>
              {adjustMutation.isPending ? 'Adjusting…' : 'Adjust'}
            </AdminButton>
          </div>
        </form>
      </AdminPanel>
    </div>
  );
}

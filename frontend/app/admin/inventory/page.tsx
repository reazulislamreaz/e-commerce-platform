'use client';

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
  mutationErrorMessage,
  useAdminMutation,
  useInventoryBalances,
  useInventoryLocations,
  useInventoryMovements,
  useStockAlerts,
  type InventoryBalance,
  type InventoryMovement,
} from '@/features/admin';

function StockAlertsPanel({
  onFillAlert,
}: {
  onFillAlert: (alert: { variantId: string; locationId: string; onHand: number }) => void;
}) {
  const alertsQuery = useStockAlerts({ limit: 50 });
  const rows = alertsQuery.data ?? [];

  return (
    <AdminPanel
      title="Stock alerts"
      description="Open LOW and OUT alerts across locations. Click a row to prefill the adjust form."
    >
      {alertsQuery.isError ? <AdminError>Could not load stock alerts.</AdminError> : null}
      {alertsQuery.isLoading ? <AdminTableSkeleton /> : null}
      {!alertsQuery.isLoading && !alertsQuery.isError && rows.length === 0 ? (
        <AdminEmpty>No open stock alerts.</AdminEmpty>
      ) : null}
      {rows.length > 0 ? (
        <AdminTable>
          <thead>
            <tr>
              <AdminTh>Level</AdminTh>
              <AdminTh>SKU</AdminTh>
              <AdminTh>Variant</AdminTh>
              <AdminTh>Location</AdminTh>
              <AdminTh>Available</AdminTh>
              <AdminTh>Threshold</AdminTh>
              <AdminTh>Opened</AdminTh>
            </tr>
          </thead>
          <tbody>
            {rows.map((alert) => (
              <tr
                key={alert.id}
                className="cursor-pointer hover:bg-[#FFFFFF]"
                onClick={() =>
                  onFillAlert({
                    variantId: alert.variantId,
                    locationId: alert.locationId,
                    onHand: alert.onHand,
                  })
                }
              >
                <AdminTd>
                  <StatusPill>{alert.level}</StatusPill>
                </AdminTd>
                <AdminTd>
                  <span className="font-semibold text-[#111111]">{alert.sku}</span>
                </AdminTd>
                <AdminTd>
                  <span className="text-[#111111]">
                    {alert.size} / {alert.color}
                  </span>
                </AdminTd>
                <AdminTd>
                  <span className="text-[#111111]">{alert.locationCode}</span>
                </AdminTd>
                <AdminTd>
                  <span className="text-[#C9A227]">{alert.available}</span>
                </AdminTd>
                <AdminTd>{alert.threshold}</AdminTd>
                <AdminTd>
                  <span className="text-[#555555]">
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : null}
    </AdminPanel>
  );
}

function InventoryMovementsPanel({ seedVariantId = '' }: { seedVariantId?: string }) {
  const [variantFilter, setVariantFilter] = useState(seedVariantId);
  const [cursor, setCursor] = useState<string | undefined>();
  const [priorRows, setPriorRows] = useState<InventoryMovement[]>([]);
  const [appliedVariantId, setAppliedVariantId] = useState(seedVariantId.trim());

  const queryParams = useMemo(
    () => ({
      limit: 20,
      ...(appliedVariantId ? { variantId: appliedVariantId } : {}),
      ...(cursor ? { cursor } : {}),
    }),
    [appliedVariantId, cursor],
  );

  const movementsQuery = useInventoryMovements(queryParams);
  const pageRows = movementsQuery.data?.data ?? [];
  const rows = cursor ? [...priorRows, ...pageRows] : pageRows;
  const nextCursor = movementsQuery.data?.meta.nextCursor ?? null;
  const showInitialLoading = movementsQuery.isLoading && !cursor && rows.length === 0;

  function applyFilter() {
    setPriorRows([]);
    setCursor(undefined);
    setAppliedVariantId(variantFilter.trim());
  }

  function loadMore() {
    if (!movementsQuery.data?.meta.nextCursor) return;
    setPriorRows(cursor ? [...priorRows, ...pageRows] : pageRows);
    setCursor(movementsQuery.data.meta.nextCursor);
  }

  return (
    <AdminPanel
      title="Inventory movements"
      description="Append-only stock ledger. Filter by variant UUID when investigating a SKU."
    >
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <label className="block min-w-[220px] flex-1 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
            Variant ID
          </span>
          <AdminInput
            value={variantFilter}
            onChange={(event) => setVariantFilter(event.target.value)}
            placeholder="Optional UUID filter"
            autoComplete="off"
          />
        </label>
        <AdminButton type="button" variant="secondary" onClick={applyFilter}>
          Apply filter
        </AdminButton>
      </div>

      {movementsQuery.isError ? <AdminError>Could not load movements.</AdminError> : null}
      {showInitialLoading ? <AdminTableSkeleton /> : null}
      {!showInitialLoading && !movementsQuery.isError && rows.length === 0 ? (
        <AdminEmpty>No inventory movements found.</AdminEmpty>
      ) : null}

      {rows.length > 0 ? (
        <>
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>When</AdminTh>
                <AdminTh>Type</AdminTh>
                <AdminTh>Variant</AdminTh>
                <AdminTh>Location</AdminTh>
                <AdminTh>Qty</AdminTh>
                <AdminTh>Balance after</AdminTh>
                <AdminTh>Note</AdminTh>
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
                    <span className="font-mono text-xs uppercase text-[#C9A227]">{row.type}</span>
                  </AdminTd>
                  <AdminTd>
                    <span className="font-mono text-xs text-[#111111]">
                      {row.variantId.slice(0, 8)}…
                    </span>
                  </AdminTd>
                  <AdminTd>
                    <span className="font-mono text-xs text-[#555555]">
                      {row.locationId.slice(0, 8)}…
                    </span>
                  </AdminTd>
                  <AdminTd>
                    <span className={row.quantity < 0 ? 'text-red-700' : 'text-emerald-700'}>
                      {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
                    </span>
                  </AdminTd>
                  <AdminTd>{row.balanceAfter}</AdminTd>
                  <AdminTd>
                    <span className="text-[#555555]">{row.note?.trim() || '—'}</span>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <div className="mt-4 flex justify-center">
            {movementsQuery.isFetching && cursor ? (
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
          <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
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

      {showInitialLoading ? <AdminTableSkeleton /> : null}

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
                  className="cursor-pointer hover:bg-[#FFFFFF]"
                  onClick={() => onFillBalance(balance)}
                >
                  <AdminTd>
                    <span className="font-semibold text-[#111111]">{balance.variantSku}</span>
                    <p className="font-mono text-xs text-[#555555]">
                      {balance.variantId.slice(0, 8)}…
                    </p>
                  </AdminTd>
                  <AdminTd>
                    <span className="font-mono text-xs text-[#555555]">{balance.variantId}</span>
                  </AdminTd>
                  <AdminTd>
                    <span className="text-[#111111]">{balance.locationCode}</span>
                  </AdminTd>
                  <AdminTd>{balance.onHand}</AdminTd>
                  <AdminTd>{balance.reserved}</AdminTd>
                  <AdminTd>
                    <span className="text-[#C9A227]">{balance.available}</span>
                  </AdminTd>
                  <AdminTd>
                    <span className="text-[#555555]">{balance.version}</span>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>

          <div className="mt-4 flex justify-center">
            {balancesQuery.isFetching && cursor ? (
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

export default function AdminInventoryPage() {
  const locationsQuery = useInventoryLocations();
  const [locationId, setLocationId] = useState('');
  const [movementSeedVariantId, setMovementSeedVariantId] = useState('');

  const [variantId, setVariantId] = useState('');
  const [adjustLocationId, setAdjustLocationId] = useState('');
  const [quantityDelta, setQuantityDelta] = useState('0');
  const [expectedVersion, setExpectedVersion] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const adjustMutation = useAdminMutation(adminApi.adjustInventory, [
    adminKeys.inventoryRoot(),
    adminKeys.inventoryMovementsRoot(),
    adminKeys.stockAlertsRoot(),
  ]);
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
        description="Track stock balances, alerts, movements, and record adjustments."
      />
      <StockAlertsPanel
        onFillAlert={(alert) => {
          setVariantId(alert.variantId);
          setAdjustLocationId(alert.locationId);
          setMovementSeedVariantId(alert.variantId);
          setExpectedVersion('');
        }}
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
          setMovementSeedVariantId(balance.variantId);
        }}
      />

      <AdminPanel
        title="Adjust inventory"
        description="Apply a signed quantity delta. A fresh idempotency key is generated on each submit."
      >
        {formError ? <AdminError>{formError}</AdminError> : null}
        {success ? (
          <p className="mb-3 rounded-[4px] border border-[#C9A227]/40 bg-[#FFFFFF] px-3 py-2 text-sm text-[#C9A227]">
            {success}
          </p>
        ) : null}

        <form onSubmit={(event) => void onAdjust(event)} className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
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
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
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
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
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
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
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
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
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

      <InventoryMovementsPanel
        key={movementSeedVariantId || 'all-movements'}
        seedVariantId={movementSeedVariantId}
      />
    </div>
  );
}

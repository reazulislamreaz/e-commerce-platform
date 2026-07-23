'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Box,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  MoreHorizontal,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
} from 'lucide-react';
import { AdminPagination, type AdminPageSize } from '@/components/admin/admin-pagination';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { AdminTableSkeleton } from '@/components/common/skeleton';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminInput,
  AdminPageHeader,
  AdminPanel,
  AdminSelect,
  AdminStatCard,
  AdminTable,
  AdminTd,
  AdminTh,
  StatusPill,
} from '@/components/admin/admin-ui';
import {
  adminApi,
  adminKeys,
  useActiveDeliveryPartners,
  useAdminMutation,
  useAdminOrders,
  useOrdersSummary,
  type AdminOrder,
  type AdminOrderListParams,
  type AdminOrderSort,
  type BulkOrderAction,
} from '@/features/admin';
import { formatTaka } from '@/lib/currency';
import { getUserFacingErrorMessage } from '@/lib/user-facing-error';
import { ShipOrderModal } from './ship-order-modal';

const ORDER_INVALIDATE = [adminKeys.ordersRoot(), adminKeys.ordersSummary()] as const;

const SORT_OPTIONS: Array<{ value: AdminOrderSort; label: string }> = [
  { value: 'CREATED_DESC', label: 'Newest created' },
  { value: 'CREATED_ASC', label: 'Oldest created' },
  { value: 'TOTAL_DESC', label: 'Highest total' },
  { value: 'TOTAL_ASC', label: 'Lowest total' },
  { value: 'UPDATED_DESC', label: 'Recently updated' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'EXCHANGED', label: 'Exchanged' },
];

type ConfirmState =
  | {
      type: 'single';
      action: 'confirm' | 'process' | 'pack' | 'deliver' | 'cancel';
      order: AdminOrder;
    }
  | { type: 'bulk'; action: BulkOrderAction; count: number }
  | null;

export function OrdersDirectory({
  showSummary = false,
  lockedStatus,
}: {
  showSummary?: boolean;
  lockedStatus?: string;
}) {
  const router = useRouter();

  // Filters State
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(lockedStatus || '');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [deliveryPartnerId, setDeliveryPartnerId] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [sort, setSort] = useState<AdminOrderSort>('CREATED_DESC');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(20);

  // Selection & Actions State
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuOrderId, setMenuOrderId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [shippingTargetOrders, setShippingTargetOrders] = useState<AdminOrder[]>([]);

  // Summary and Delivery Partners queries
  const summaryQuery = useOrdersSummary();
  const activePartnersQuery = useActiveDeliveryPartners();
  const partners = activePartnersQuery.data ?? [];

  const queryParams: AdminOrderListParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      sort,
      ...(lockedStatus ? { status: lockedStatus } : statusFilter ? { status: statusFilter } : {}),
      ...(search ? { search } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(deliveryPartnerId ? { deliveryPartnerId } : {}),
      ...(createdFrom ? { createdFrom } : {}),
      ...(createdTo ? { createdTo } : {}),
    }),
    [
      page,
      pageSize,
      sort,
      lockedStatus,
      statusFilter,
      search,
      paymentStatus,
      paymentMethod,
      deliveryPartnerId,
      createdFrom,
      createdTo,
    ],
  );

  const ordersQuery = useAdminOrders(queryParams);
  const rows = useMemo(() => ordersQuery.data?.data ?? [], [ordersQuery.data?.data]);
  const meta = ordersQuery.data?.meta ?? {
    page,
    pageSize,
    limit: pageSize,
    total: 0,
    totalPages: 1,
  };

  // Mutations
  const updateStatusMutation = useAdminMutation(
    ({
      id,
      body,
    }: {
      id: string;
      body: {
        status: string;
        note?: string;
        deliveryPartnerId?: string;
        trackingNumber?: string;
        trackingUrl?: string;
        shippingNote?: string;
      };
    }) => adminApi.updateOrderStatus(id, body),
    [...ORDER_INVALIDATE],
    { successMessage: 'Order status updated successfully' },
  );

  const bulkMutation = useAdminMutation(
    (body: {
      ids: string[];
      action: BulkOrderAction;
      note?: string;
      deliveryPartnerId?: string;
      trackingNumber?: string;
      trackingUrl?: string;
      shippingNote?: string;
    }) => adminApi.bulkOrders(body),
    [...ORDER_INVALIDATE],
    {
      successMessage: (result) => `Processed ${result.processed} order(s)`,
      errorFallback: 'Bulk action failed',
    },
  );

  const pending = updateStatusMutation.isPending || bulkMutation.isPending;
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  function resetPagination() {
    setPage(1);
    setSelected(new Set());
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(rows.map((row) => row.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    resetPagination();
  }

  function clearFilters() {
    setSearchInput('');
    setSearch('');
    if (!lockedStatus) setStatusFilter('');
    setPaymentStatus('');
    setPaymentMethod('');
    setDeliveryPartnerId('');
    setCreatedFrom('');
    setCreatedTo('');
    setSort('CREATED_DESC');
    resetPagination();
  }

  async function handleExportCsv() {
    if (selected.size === 0) return;
    try {
      const result = await bulkMutation.mutateAsync({
        ids: [...selected],
        action: 'EXPORT',
      });
      if (result.csv) {
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Toast handled by mutation
    }
  }

  function openShipModalForSingle(order: AdminOrder) {
    setShippingTargetOrders([order]);
    setShipModalOpen(true);
  }

  function openShipModalForBulk() {
    const selectedOrders = rows.filter((r) => selected.has(r.id));
    setShippingTargetOrders(selectedOrders);
    setShipModalOpen(true);
  }

  async function handleConfirmShip(shipData: {
    deliveryPartnerId?: string;
    trackingNumber: string;
    trackingUrl?: string;
    shippingNote?: string;
    estimatedDeliveryAt?: string;
  }) {
    if (shippingTargetOrders.length === 1) {
      const order = shippingTargetOrders[0];
      await updateStatusMutation.mutateAsync({
        id: order.id,
        body: {
          status: 'SHIPPED',
          ...shipData,
        },
      });
    } else {
      await bulkMutation.mutateAsync({
        ids: shippingTargetOrders.map((o) => o.id),
        action: 'SHIP',
        ...shipData,
      });
      setSelected(new Set());
    }
    setShipModalOpen(false);
    setShippingTargetOrders([]);
  }

  async function runConfirm() {
    if (!confirm) return;

    if (confirm.type === 'bulk') {
      await bulkMutation.mutateAsync({
        ids: [...selected],
        action: confirm.action,
      });
      setSelected(new Set());
      setConfirm(null);
      return;
    }

    const { order, action } = confirm;
    const actionMap: Record<string, string> = {
      confirm: 'CONFIRMED',
      process: 'PROCESSING',
      pack: 'PACKED',
      deliver: 'DELIVERED',
      cancel: 'CANCELLED',
    };
    const targetStatus = actionMap[action];
    if (targetStatus) {
      await updateStatusMutation.mutateAsync({
        id: order.id,
        body: { status: targetStatus },
      });
    }
    setConfirm(null);
    setMenuOrderId(null);
  }

  const titleText = lockedStatus
    ? `${lockedStatus.charAt(0) + lockedStatus.slice(1).toLowerCase()} Queue`
    : 'Orders Directory';

  const summary = summaryQuery.data;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={titleText}
        description={
          lockedStatus
            ? `Managing orders currently in ${lockedStatus} status.`
            : 'Track, filter, export, and fulfill customer orders.'
        }
        actions={
          <div className="flex items-center gap-2">
            <AdminButton
              variant="secondary"
              disabled={selected.size === 0 || pending}
              onClick={handleExportCsv}
            >
              <Download className="size-3.5" strokeWidth={1.7} />
              Export CSV ({selected.size})
            </AdminButton>
          </div>
        }
      />

      {/* KPI Summary Cards Strip (Main Orders Page Only) */}
      {showSummary ? (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            label="Today's Orders"
            value={summary?.today ?? 0}
            hint="New orders placed today"
            icon={Clock}
            tone="gold"
            loading={summaryQuery.isLoading}
          />
          <AdminStatCard
            label="Pending Queue"
            value={summary?.pending ?? 0}
            hint="Requires confirmation"
            icon={AlertCircle}
            tone="amber"
            active={statusFilter === 'PENDING'}
            onClick={() => router.push('/admin/orders/pending')}
            loading={summaryQuery.isLoading}
          />
          <AdminStatCard
            label="Confirmed Queue"
            value={summary?.confirmed ?? 0}
            hint="Ready for processing"
            icon={CheckCircle2}
            tone="sky"
            active={statusFilter === 'CONFIRMED'}
            onClick={() => router.push('/admin/orders/confirmed')}
            loading={summaryQuery.isLoading}
          />
          <AdminStatCard
            label="Processing Queue"
            value={summary?.processing ?? 0}
            hint="Item picking & prep"
            icon={RefreshCw}
            tone="amber"
            active={statusFilter === 'PROCESSING'}
            onClick={() => router.push('/admin/orders/processing')}
            loading={summaryQuery.isLoading}
          />
          <AdminStatCard
            label="Packed Queue"
            value={summary?.packed ?? 0}
            hint="Ready for courier dispatch"
            icon={Box}
            tone="sky"
            active={statusFilter === 'PACKED'}
            onClick={() => router.push('/admin/orders/packed')}
            loading={summaryQuery.isLoading}
          />
          <AdminStatCard
            label="Shipped Queue"
            value={summary?.shipped ?? 0}
            hint="In transit with carrier"
            icon={Truck}
            tone="amber"
            active={statusFilter === 'SHIPPED'}
            onClick={() => router.push('/admin/orders/shipped')}
            loading={summaryQuery.isLoading}
          />
          <AdminStatCard
            label="Delivered Total"
            value={summary?.delivered ?? 0}
            hint="Successfully completed"
            icon={PackageCheck}
            tone="emerald"
            active={statusFilter === 'DELIVERED'}
            onClick={() => router.push('/admin/orders/delivered')}
            loading={summaryQuery.isLoading}
          />
          <AdminStatCard
            label="Total Collected"
            value={formatTaka(summary?.totalRevenue ?? 0)}
            hint={`Avg order ${formatTaka(summary?.averageOrderValue ?? 0)}`}
            icon={DollarSign}
            tone="gold"
            loading={summaryQuery.isLoading}
          />
        </div>
      ) : null}

      <AdminPanel
        title={lockedStatus ? `${lockedStatus} Order List` : 'Order Queue'}
        description="Filter fulfillment queue by status, partner, payment method, date range, or customer details."
      >
        {/* Search & Filters Bar */}
        <form onSubmit={handleFilterSubmit} className="mb-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminInput
              aria-label="Search orders"
              placeholder="Order #, name, phone, email"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {!lockedStatus ? (
              <AdminSelect
                aria-label="Status filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  resetPagination();
                }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </AdminSelect>
            ) : null}
            <AdminSelect
              aria-label="Payment Status"
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                resetPagination();
              }}
            >
              <option value="">All payment statuses</option>
              <option value="PENDING">Payment Pending</option>
              <option value="COLLECTED">Payment Collected</option>
              <option value="CANCELLED">Payment Cancelled</option>
            </AdminSelect>
            <AdminSelect
              aria-label="Delivery Partner"
              value={deliveryPartnerId}
              onChange={(e) => {
                setDeliveryPartnerId(e.target.value);
                resetPagination();
              }}
            >
              <option value="">All delivery partners</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.companyName}
                </option>
              ))}
            </AdminSelect>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-[#555555]">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[.08em]">
                From Date
              </span>
              <AdminInput
                type="date"
                value={createdFrom}
                onChange={(e) => {
                  setCreatedFrom(e.target.value);
                  resetPagination();
                }}
              />
            </label>
            <label className="text-xs text-[#555555]">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[.08em]">
                To Date
              </span>
              <AdminInput
                type="date"
                value={createdTo}
                onChange={(e) => {
                  setCreatedTo(e.target.value);
                  resetPagination();
                }}
              />
            </label>
            <AdminSelect
              className="w-auto"
              aria-label="Sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as AdminOrderSort);
                resetPagination();
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </AdminSelect>
            <div className="flex items-center gap-2 pb-0.5">
              <AdminButton type="submit">
                <Search className="size-3.5" strokeWidth={1.7} />
                Apply
              </AdminButton>
              <AdminButton type="button" variant="secondary" onClick={clearFilters}>
                Clear
              </AdminButton>
            </div>
          </div>
        </form>

        {/* Bulk Action Banner */}
        {selected.size > 0 ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[#E8D9A8] bg-[#FFF8E7] px-3.5 py-2.5">
            <p className="mr-2 text-xs font-semibold text-[#111111]">
              {selected.size} order{selected.size === 1 ? '' : 's'} selected
            </p>
            <AdminButton
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() =>
                setConfirm({
                  type: 'bulk',
                  action: 'CONFIRM' as BulkOrderAction,
                  count: selected.size,
                })
              }
            >
              Confirm All
            </AdminButton>
            <AdminButton
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() =>
                setConfirm({
                  type: 'bulk',
                  action: 'START_PROCESSING' as BulkOrderAction,
                  count: selected.size,
                })
              }
            >
              Start Processing
            </AdminButton>
            <AdminButton
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() =>
                setConfirm({
                  type: 'bulk',
                  action: 'MARK_PACKED' as BulkOrderAction,
                  count: selected.size,
                })
              }
            >
              Mark Packed
            </AdminButton>
            <AdminButton
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={openShipModalForBulk}
            >
              Ship Selected…
            </AdminButton>
            <AdminButton
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() =>
                setConfirm({
                  type: 'bulk',
                  action: 'CANCEL' as BulkOrderAction,
                  count: selected.size,
                })
              }
            >
              Cancel Selected
            </AdminButton>
          </div>
        ) : null}

        {ordersQuery.isError ? (
          <AdminError>
            {getUserFacingErrorMessage(ordersQuery.error, 'Could not load orders.')}
          </AdminError>
        ) : null}

        {ordersQuery.isLoading ? <AdminTableSkeleton rows={8} /> : null}

        {!ordersQuery.isLoading && rows.length === 0 ? (
          <AdminEmpty>No orders match these filters.</AdminEmpty>
        ) : null}

        {rows.length > 0 ? (
          <div className={ordersQuery.isFetching ? 'opacity-70 transition-opacity' : undefined}>
            <AdminTable>
              <thead>
                <tr>
                  <AdminTh className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all on page"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="size-4 rounded border-[#E5E7EB] accent-[#C9A227]"
                    />
                  </AdminTh>
                  <AdminTh>Order Number</AdminTh>
                  <AdminTh>Customer & Contact</AdminTh>
                  <AdminTh>Total</AdminTh>
                  <AdminTh>Payment</AdminTh>
                  <AdminTh>Carrier / Partner</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh>Date</AdminTh>
                  <AdminTh className="text-right">Actions</AdminTh>
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => {
                  const customerName =
                    order.shippingAddress?.fullName || order.customerName || 'Guest Customer';
                  const partnerName =
                    order.shipment?.deliveryPartnerName || order.shipment?.carrier || '—';

                  return (
                    <tr key={order.id}>
                      <AdminTd>
                        <input
                          type="checkbox"
                          aria-label={`Select order #${order.number}`}
                          checked={selected.has(order.id)}
                          onChange={() => toggleOne(order.id)}
                          className="size-4 rounded border-[#E5E7EB] accent-[#C9A227]"
                        />
                      </AdminTd>
                      <AdminTd>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-bold text-[#111111] hover:text-[#C9A227]"
                        >
                          #{order.number}
                        </Link>
                      </AdminTd>
                      <AdminTd>
                        {order.userId ? (
                          <Link
                            href={`/admin/users/${order.userId}`}
                            className="font-semibold text-[#111111] hover:underline"
                          >
                            {customerName}
                          </Link>
                        ) : (
                          <p className="font-semibold text-[#111111]">{customerName}</p>
                        )}
                        <p className="text-xs text-[#555555]">
                          {order.phone || order.email || '—'}
                        </p>
                      </AdminTd>
                      <AdminTd>
                        <span className="font-bold text-[#C9A227]">{formatTaka(order.total)}</span>
                      </AdminTd>
                      <AdminTd>
                        <StatusPill>{order.paymentStatus || 'PENDING'}</StatusPill>
                        <p className="mt-0.5 text-[10px] uppercase text-[#555555]">
                          {order.paymentMethod}
                        </p>
                      </AdminTd>
                      <AdminTd>
                        <span className="text-xs font-medium text-[#111111]">{partnerName}</span>
                        {order.trackingNumber ? (
                          <p className="text-[11px] text-[#555555]">Trk: {order.trackingNumber}</p>
                        ) : null}
                      </AdminTd>
                      <AdminTd>
                        <StatusPill>{order.status}</StatusPill>
                      </AdminTd>
                      <AdminTd>
                        <span className="text-xs text-[#555555]">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </AdminTd>
                      <AdminTd className="text-right">
                        <div className="relative inline-block">
                          <AdminButton
                            variant="secondary"
                            className="!px-2"
                            aria-label={`Actions for order #${order.number}`}
                            onClick={() =>
                              setMenuOrderId((curr) => (curr === order.id ? null : order.id))
                            }
                          >
                            <MoreHorizontal className="size-4" strokeWidth={1.7} />
                          </AdminButton>
                          {menuOrderId === order.id ? (
                            <div className="absolute right-0 z-20 mt-1 min-w-44 rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
                              <ActionItem href={`/admin/orders/${order.id}`}>
                                View Details
                              </ActionItem>
                              <ActionItem
                                href={`/admin/orders/${order.id}/invoice`}
                                target="_blank"
                              >
                                Print Invoice
                              </ActionItem>
                              {order.status === 'pending' ? (
                                <ActionItem
                                  onClick={() =>
                                    setConfirm({ type: 'single', action: 'confirm', order })
                                  }
                                >
                                  Confirm Order
                                </ActionItem>
                              ) : null}
                              {order.status === 'confirmed' ? (
                                <ActionItem
                                  onClick={() =>
                                    setConfirm({ type: 'single', action: 'process', order })
                                  }
                                >
                                  Start Processing
                                </ActionItem>
                              ) : null}
                              {order.status === 'processing' ? (
                                <ActionItem
                                  onClick={() =>
                                    setConfirm({ type: 'single', action: 'pack', order })
                                  }
                                >
                                  Mark Packed
                                </ActionItem>
                              ) : null}
                              {order.status === 'packed' ? (
                                <ActionItem onClick={() => openShipModalForSingle(order)}>
                                  Ship Order…
                                </ActionItem>
                              ) : null}
                              {order.status === 'shipped' ? (
                                <ActionItem
                                  onClick={() =>
                                    setConfirm({ type: 'single', action: 'deliver', order })
                                  }
                                >
                                  Mark Delivered
                                </ActionItem>
                              ) : null}
                              {!['delivered', 'cancelled'].includes(order.status) ? (
                                <ActionItem
                                  danger
                                  onClick={() =>
                                    setConfirm({ type: 'single', action: 'cancel', order })
                                  }
                                >
                                  Cancel Order
                                </ActionItem>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </AdminTd>
                    </tr>
                  );
                })}
              </tbody>
            </AdminTable>

            <AdminPagination
              meta={meta}
              entityLabel="orders"
              isFetching={ordersQuery.isFetching && !ordersQuery.isLoading}
              onPageChange={(next) => {
                setPage(next);
                setSelected(new Set());
                setMenuOrderId(null);
              }}
              onPageSizeChange={(next) => {
                setPageSize(next);
                resetPagination();
              }}
            />
          </div>
        ) : null}
      </AdminPanel>

      {/* Single / Bulk Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.type === 'bulk' ? `Bulk ${confirm.action}` : 'Update Order Status'}
        message={
          confirm?.type === 'bulk'
            ? `Apply ${confirm.action.replaceAll('_', ' ')} to ${confirm.count} selected orders?`
            : `Transition order #${confirm?.order.number} to ${confirm?.action.toUpperCase()}?`
        }
        confirmLabel="Confirm"
        loading={pending}
        onClose={() => (pending ? null : setConfirm(null))}
        onConfirm={() => void runConfirm()}
      />

      {/* Shipment Modal */}
      <ShipOrderModal
        open={shipModalOpen}
        orderNumbers={shippingTargetOrders.map((o) => o.number)}
        count={shippingTargetOrders.length}
        loading={pending}
        onClose={() => setShipModalOpen(false)}
        onConfirm={handleConfirmShip}
      />
    </div>
  );
}

function ActionItem({
  children,
  onClick,
  href,
  target,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  target?: string;
  danger?: boolean;
}) {
  const className = `block w-full px-3 py-2 text-left text-xs font-semibold ${
    danger ? 'text-red-700 hover:bg-red-50' : 'text-[#111111] hover:bg-[#FAFAFA]'
  }`;
  if (href) {
    return (
      <Link href={href} target={target} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ExternalLink, Printer, Save, User } from 'lucide-react';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import {
  AdminButton,
  AdminError,
  AdminPanel,
  AdminSkeleton,
  AdminTextarea,
  StatusPill,
} from '@/components/admin/admin-ui';
import { adminApi, adminKeys, useAdminMutation, useAdminOrder } from '@/features/admin';
import { ShipOrderModal } from '@/features/admin/components/ship-order-modal';
import { formatTaka } from '@/lib/currency';

const ORDER_INVALIDATE = [adminKeys.ordersRoot(), adminKeys.orderRoot()] as const;

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderQuery = useAdminOrder(id);
  const order = orderQuery.data;

  const [notes, setNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<
    'CONFIRMED' | 'PROCESSING' | 'PACKED' | 'DELIVERED' | 'CANCELLED' | null
  >(null);

  useEffect(() => {
    if (order) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotes(order.notes ?? '');
    }
  }, [order]);

  const updateNotesMutation = useAdminMutation(
    (newNotes: string) => adminApi.updateOrderNotes(id, newNotes),
    [...ORDER_INVALIDATE],
    { successMessage: 'Internal staff notes updated' },
  );

  const statusMutation = useAdminMutation(
    (body: {
      status: string;
      note?: string;
      deliveryPartnerId?: string;
      trackingNumber?: string;
      trackingUrl?: string;
      shippingNote?: string;
      estimatedDeliveryAt?: string;
    }) => adminApi.updateOrderStatus(id, body),
    [...ORDER_INVALIDATE],
    { successMessage: 'Order status updated successfully' },
  );

  const cancelMutation = useAdminMutation(
    (reason: string) => adminApi.cancelOrder(id, reason),
    [...ORDER_INVALIDATE],
    { successMessage: 'Order cancelled' },
  );

  const busy =
    updateNotesMutation.isPending || statusMutation.isPending || cancelMutation.isPending;

  if (orderQuery.isLoading) {
    return (
      <div className="space-y-5">
        <AdminSkeleton className="h-8 w-48" />
        <AdminSkeleton className="h-64 w-full" />
        <AdminSkeleton className="h-48 w-full" />
      </div>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <div className="space-y-4">
        <AdminError>Order not found or failed to load.</AdminError>
        <Link
          href="/admin/orders"
          className="inline-block text-[10px] font-bold uppercase tracking-[.08em] text-[#C9A227] hover:underline"
        >
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const normStatus = order.status.toUpperCase();
  const canConfirm = normStatus === 'PENDING';
  const canProcess = normStatus === 'CONFIRMED';
  const canPack = normStatus === 'PROCESSING';
  const canShip = normStatus === 'PACKED';
  const canDeliver = normStatus === 'SHIPPED';
  const canCancel = !['DELIVERED', 'CANCELLED', 'RETURNED', 'EXCHANGED'].includes(normStatus);
  const address = order.shippingAddress;
  const shipment = order.shipment;

  async function handleSaveNotes() {
    await updateNotesMutation.mutateAsync(notes.trim());
  }

  async function handleStatusTransition(targetStatus: string, note?: string) {
    await statusMutation.mutateAsync({ status: targetStatus, note });
    setConfirmStatus(null);
  }

  async function handleCancelOrder() {
    if (cancelReason.trim().length < 3) return;
    await cancelMutation.mutateAsync(cancelReason.trim());
    setCancelReason('');
    setConfirmStatus(null);
  }

  async function handleShipConfirm(shipData: {
    deliveryPartnerId?: string;
    trackingNumber: string;
    trackingUrl?: string;
    shippingNote?: string;
    estimatedDeliveryAt?: string;
  }) {
    await statusMutation.mutateAsync({
      status: 'SHIPPED',
      ...shipData,
    });
    setShipModalOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="text-[10px] font-bold uppercase tracking-[.08em] text-[#C9A227] hover:text-[#D4B03A]"
          >
            ← Orders
          </Link>
          <span className="text-[#E5E7EB]">|</span>
          <h1 className="text-xl font-extrabold tracking-[-.02em] text-[#111111] sm:text-2xl">
            Order #{order.number}
          </h1>
          <StatusPill>{order.status}</StatusPill>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/orders/${order.id}/invoice`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[.08em] text-[#111111] shadow-xs hover:border-[#111111] hover:bg-[#FAFAFA]"
          >
            <Printer className="size-3.5" strokeWidth={1.7} />
            Print Invoice
          </Link>

          {canConfirm ? (
            <AdminButton disabled={busy} onClick={() => setConfirmStatus('CONFIRMED')}>
              Confirm Order
            </AdminButton>
          ) : null}

          {canProcess ? (
            <AdminButton disabled={busy} onClick={() => setConfirmStatus('PROCESSING')}>
              Start Processing
            </AdminButton>
          ) : null}

          {canPack ? (
            <AdminButton disabled={busy} onClick={() => setConfirmStatus('PACKED')}>
              Mark Packed
            </AdminButton>
          ) : null}

          {canShip ? (
            <AdminButton disabled={busy} onClick={() => setShipModalOpen(true)}>
              Ship Order…
            </AdminButton>
          ) : null}

          {canDeliver ? (
            <AdminButton disabled={busy} onClick={() => setConfirmStatus('DELIVERED')}>
              Mark Delivered
            </AdminButton>
          ) : null}

          {canCancel ? (
            <AdminButton
              variant="danger"
              disabled={busy}
              onClick={() => setConfirmStatus('CANCELLED')}
            >
              Cancel Order
            </AdminButton>
          ) : null}
        </div>
      </div>

      {/* Fulfillment Status Timeline */}
      <AdminPanel title="Order Lifecycle Progress">
        <ol className="flex flex-col gap-0 sm:flex-row sm:gap-2">
          {order.timeline.map((step, index) => (
            <li key={`${step.label}-${step.at}`} className="flex flex-1 sm:flex-col">
              <div className="flex flex-col items-center sm:w-full sm:flex-row">
                <span
                  aria-hidden
                  className={`flex size-3 shrink-0 items-center justify-center rounded-full border-2 ${
                    step.done ? 'border-[#C9A227] bg-[#C9A227]' : 'border-[#E5E7EB] bg-transparent'
                  }`}
                />
                {index < order.timeline.length - 1 ? (
                  <span
                    aria-hidden
                    className={`min-h-6 w-0.5 flex-1 sm:h-0.5 sm:min-h-0 sm:w-full ${
                      step.done ? 'bg-[#C9A227]/50' : 'bg-[#E5E7EB]'
                    }`}
                  />
                ) : null}
              </div>
              <div className="-mt-0.5 pb-4 pl-3 sm:mt-2 sm:pb-0 sm:pl-0">
                <p
                  className={`text-[11px] font-semibold ${
                    step.done ? 'text-[#C9A227]' : 'text-[#555555]'
                  }`}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 text-[10px] text-[#555555]">
                  {step.at ? new Date(step.at).toLocaleString() : '—'}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </AdminPanel>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols): Items & Shipment */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Items */}
          <AdminPanel title="Ordered Line Items">
            <ul className="space-y-3">
              {order.items.map((item) => (
                <li
                  key={`${item.productId}-${item.size}-${item.color}`}
                  className="flex gap-3 border-b border-[#E5E7EB]/60 pb-3 last:border-0 last:pb-0"
                >
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-[4px] bg-[#e4e3e1]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold text-[#111111]">{item.name}</p>
                    <p className="text-[12px] text-[#555555]">
                      Size: {item.size} · Color: {item.color}
                      {item.sku ? ` · SKU: ${item.sku}` : ''}
                    </p>
                    <p className="text-[12px] text-[#555555]">
                      Quantity: {item.quantity} × {formatTaka(item.unitPrice)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[#C9A227]">
                    {formatTaka(item.lineTotal ?? item.unitPrice * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-1.5 border-t border-[#E5E7EB] pt-4 text-sm">
              <div className="flex justify-between text-[#555555]">
                <dt>Subtotal</dt>
                <dd className="font-medium text-[#111111]">{formatTaka(order.subtotal)}</dd>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between text-[#555555]">
                  <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
                  <dd className="font-medium text-emerald-700">−{formatTaka(order.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between text-[#555555]">
                <dt>Shipping</dt>
                <dd className="font-medium text-[#111111]">
                  {order.shipping === 0 ? 'Free' : formatTaka(order.shipping)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-[#E5E7EB] pt-2 text-base font-extrabold text-[#111111]">
                <dt>Grand Total</dt>
                <dd className="text-[#C9A227]">{formatTaka(order.total)}</dd>
              </div>
            </dl>
          </AdminPanel>

          {/* Logistics & Shipment Info Card */}
          <AdminPanel
            title="Logistics & Delivery Partner"
            description="Carrier assignment and tracking details."
          >
            {shipment ? (
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
                    Carrier / Partner
                  </span>
                  <p className="mt-0.5 font-semibold text-[#111111]">
                    {shipment.deliveryPartnerName || shipment.carrier || 'Standard Courier'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
                    Tracking Number
                  </span>
                  <p className="mt-0.5 font-semibold text-[#C9A227]">
                    {order.trackingNumber || shipment.trackingNumber || 'Not set'}
                  </p>
                </div>
                {shipment.trackingUrl ? (
                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
                      Tracking Link
                    </span>
                    <p className="mt-0.5">
                      <a
                        href={shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-[#C9A227] hover:underline"
                      >
                        {shipment.trackingUrl}{' '}
                        <ExternalLink className="size-3.5" strokeWidth={1.7} />
                      </a>
                    </p>
                  </div>
                ) : null}
                {shipment.estimatedDeliveryAt ? (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
                      Estimated Delivery
                    </span>
                    <p className="mt-0.5 text-[#111111]">
                      {new Date(shipment.estimatedDeliveryAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : null}
                {shipment.shippedAt ? (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
                      Shipped At
                    </span>
                    <p className="mt-0.5 text-[#111111]">
                      {new Date(shipment.shippedAt).toLocaleString()}
                    </p>
                  </div>
                ) : null}
                {shipment.shippingNote ? (
                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
                      Shipping Instructions
                    </span>
                    <p className="mt-0.5 text-xs text-[#555555]">{shipment.shippingNote}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-[#555555]">
                No delivery partner assigned yet. Assign carrier when marking order as shipped.
              </p>
            )}
          </AdminPanel>

          {/* Audit Trail / Status History */}
          {order.statusHistory && order.statusHistory.length > 0 ? (
            <AdminPanel title="Status Transition History">
              <ul className="divide-y divide-[#E5E7EB]">
                {order.statusHistory.map((hist, i) => (
                  <li key={i} className="py-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <StatusPill>{hist.status}</StatusPill>
                      <span className="text-[#555555]">
                        {new Date(hist.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {hist.actor ? (
                      <p className="mt-1 text-[#555555]">
                        Updated by:{' '}
                        <span className="font-semibold text-[#111111]">{hist.actor.fullName}</span>
                      </p>
                    ) : null}
                    {hist.note ? (
                      <p className="mt-1 rounded bg-[#FAFAFA] p-2 text-[#555555]">{hist.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </AdminPanel>
          ) : null}
        </div>

        {/* Right Column (1 col): Customer Details & Staff Notes */}
        <div className="space-y-6">
          {/* Customer & Address */}
          <AdminPanel title="Customer Information">
            <div className="space-y-3 text-sm text-[#111111]">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-[#FAFAFA] text-[#555555]">
                  <User className="size-4" strokeWidth={1.7} />
                </span>
                <div>
                  <p className="font-bold text-[#111111]">{address.fullName}</p>
                  {order.userId ? (
                    <Link
                      href={`/admin/users/${order.userId}`}
                      className="text-[11px] font-semibold text-[#C9A227] hover:underline"
                    >
                      View CRM Profile →
                    </Link>
                  ) : (
                    <span className="text-[11px] text-[#555555]">Guest Checkout</span>
                  )}
                </div>
              </div>

              <div className="border-t border-[#E5E7EB] pt-3">
                <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
                  Contact
                </span>
                <p className="mt-0.5 text-xs text-[#111111]">{order.email ?? address.phone}</p>
                {order.phone ? <p className="text-xs text-[#111111]">{order.phone}</p> : null}
              </div>

              <div className="border-t border-[#E5E7EB] pt-3">
                <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
                  Shipping Address
                </span>
                <p className="mt-0.5 text-xs leading-relaxed text-[#555555]">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ''}
                  <br />
                  {address.city}, {address.district} {address.postalCode}
                  <br />
                  {address.country}
                </p>
              </div>

              <div className="border-t border-[#E5E7EB] pt-3">
                <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
                  Payment Details
                </span>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="uppercase text-[#555555]">{order.paymentMethod}</span>
                  <StatusPill>{order.paymentStatus || 'PENDING'}</StatusPill>
                </div>
              </div>
            </div>
          </AdminPanel>

          {/* Internal Staff Notes */}
          <AdminPanel
            title="Internal Staff Notes"
            description="Private notes visible to admin staff only."
          >
            <div className="space-y-3">
              <AdminTextarea
                rows={4}
                placeholder="Add internal notes about this order (e.g. VIP handling, special gift wrap requested)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={busy}
              />
              <div className="flex justify-end">
                <AdminButton
                  size="sm"
                  loading={updateNotesMutation.isPending}
                  disabled={busy}
                  onClick={handleSaveNotes}
                >
                  <Save className="size-3.5" strokeWidth={1.7} />
                  Save Notes
                </AdminButton>
              </div>
            </div>
          </AdminPanel>
        </div>
      </div>

      {/* Confirmation Dialog for single transitions */}
      {confirmStatus === 'CANCELLED' ? (
        <ConfirmDialog
          open={Boolean(confirmStatus)}
          title="Cancel Order"
          message={
            <div className="space-y-3">
              <p>Cancel order #{order.number}? Reserving inventory will be released.</p>
              <AdminTextarea
                rows={2}
                placeholder="Reason for cancellation (required)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          }
          confirmLabel="Cancel Order"
          loading={cancelMutation.isPending}
          onClose={() => (cancelMutation.isPending ? null : setConfirmStatus(null))}
          onConfirm={handleCancelOrder}
        />
      ) : (
        <ConfirmDialog
          open={Boolean(confirmStatus)}
          title={`Move Order to ${confirmStatus}`}
          message={`Transition order #${order.number} to ${confirmStatus}?`}
          confirmLabel="Confirm Transition"
          loading={statusMutation.isPending}
          onClose={() => (statusMutation.isPending ? null : setConfirmStatus(null))}
          onConfirm={() => void handleStatusTransition(confirmStatus!)}
        />
      )}

      {/* Shipment Modal */}
      <ShipOrderModal
        open={shipModalOpen}
        orderNumbers={[order.number]}
        count={1}
        loading={statusMutation.isPending}
        onClose={() => setShipModalOpen(false)}
        onConfirm={handleShipConfirm}
      />
    </div>
  );
}

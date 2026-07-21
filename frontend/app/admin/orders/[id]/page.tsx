'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  AdminButton,
  AdminError,
  AdminInput,
  AdminPanel,
  AdminSkeleton,
  AdminTextarea,
  StatusPill,
} from '@/components/admin/admin-ui';
import {
  mutationErrorMessage,
  adminApi,
  adminKeys,
  useAdminMutation,
  useAdminOrder,
} from '@/features/admin';
import { formatTaka } from '@/lib/currency';

const ORDER_INVALIDATE = [adminKeys.ordersRoot(), adminKeys.orderRoot()] as const;

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderQuery = useAdminOrder(id);
  const order = orderQuery.data;

  const [cancelReason, setCancelReason] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const statusMutation = useAdminMutation(
    (args: {
      id: string;
      status: 'PROCESSING' | 'PACKED' | 'SHIPPED' | 'DELIVERED';
      trackingNumber?: string;
    }) =>
      adminApi.updateOrderStatus(args.id, {
        status: args.status,
        ...(args.trackingNumber ? { trackingNumber: args.trackingNumber } : {}),
      }),
    [...ORDER_INVALIDATE],
    {
      successMessage: (_result, args) => `Order marked as ${args.status.toLowerCase()}.`,
      errorFallback: 'Could not update order status.',
      dedupeKey: 'admin:order-status',
    },
  );

  const cancelMutation = useAdminMutation(
    (args: { id: string; reason: string }) => adminApi.cancelOrder(args.id, args.reason),
    [...ORDER_INVALIDATE],
    {
      successMessage: 'Order cancelled.',
      errorFallback: 'Could not cancel order.',
      dedupeKey: 'admin:order-cancel',
    },
  );

  const busy = statusMutation.isPending || cancelMutation.isPending;

  async function runStatus(
    status: 'PROCESSING' | 'PACKED' | 'SHIPPED' | 'DELIVERED',
    tracking?: string,
  ) {
    if (!order) return;
    setActionError(null);
    try {
      await statusMutation.mutateAsync({
        id: order.id,
        status,
        ...(tracking ? { trackingNumber: tracking } : {}),
      });
      if (status === 'SHIPPED') setTrackingNumber('');
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not update order status.'));
    }
  }

  async function runCancel() {
    if (!order) return;
    const reason = cancelReason.trim();
    if (reason.length < 3) {
      setActionError('Cancellation reason must be at least 3 characters.');
      return;
    }
    setActionError(null);
    try {
      await cancelMutation.mutateAsync({ id: order.id, reason });
      setCancelReason('');
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not cancel order.'));
    }
  }

  if (orderQuery.isLoading) {
    return (
      <div className="space-y-5">
        <AdminSkeleton className="h-6 w-40" />
        <AdminSkeleton className="h-56 w-full" />
        <AdminSkeleton className="h-40 w-full" />
      </div>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <div className="space-y-3">
        <AdminError>Order not found or failed to load.</AdminError>
        <Link
          href="/admin/orders"
          className="inline-block text-[10px] font-bold uppercase tracking-[.08em] text-[#C9A227]"
        >
          Back to orders
        </Link>
      </div>
    );
  }

  const status = order.status;
  const canProcess = status === 'confirmed';
  const canPack = status === 'processing';
  const canShip = status === 'packed';
  const canDeliver = status === 'shipped';
  const canCancel = status === 'confirmed' || status === 'processing' || status === 'packed';
  const address = order.shippingAddress;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/orders"
          className="text-[10px] font-bold uppercase tracking-[.08em] text-[#C9A227] hover:text-[#D4B03A]"
        >
          ← Orders
        </Link>
        <StatusPill>{order.status}</StatusPill>
      </div>

      <AdminPanel
        title={`Order #${order.number}`}
        description={`Placed ${new Date(order.createdAt).toLocaleString()} · COD`}
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Buyer email
            </dt>
            <dd className="mt-1 text-[#111111]">{order.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              Tracking
            </dt>
            <dd className="mt-1 text-[#C9A227]">{order.trackingNumber ?? 'Not set'}</dd>
          </div>
        </dl>

        <ol className="mt-6 flex flex-col gap-0 sm:flex-row sm:gap-2">
          {order.timeline.map((step, index) => (
            <li key={`${step.label}-${step.at}`} className="flex flex-1 sm:flex-col">
              {/* Connector + dot */}
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
              <div className="-mt-0.5 pb-5 pl-3 sm:mt-2 sm:pb-0 sm:pl-0">
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

      <AdminPanel title="Shipping address">
        <div className="text-sm text-[#111111]">
          <p className="font-semibold text-[#111111]">{address.fullName}</p>
          <p className="mt-1 text-[#555555]">{address.phone}</p>
          <p className="mt-2 text-[#555555]">
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ''}
          </p>
          <p className="text-[#555555]">
            {address.city}, {address.district} {address.postalCode}
          </p>
          <p className="text-[#555555]">{address.country}</p>
        </div>
      </AdminPanel>

      <AdminPanel title="Items">
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
                <p className="font-medium text-[#111111]">{item.name}</p>
                <p className="text-[12px] text-[#555555]">
                  {item.color} / {item.size} × {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold text-[#C9A227]">
                {formatTaka(item.unitPrice * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-1 border-t border-[#E5E7EB] pt-4 text-sm">
          <div className="flex justify-between text-[#555555]">
            <dt>Subtotal</dt>
            <dd>{formatTaka(order.subtotal)}</dd>
          </div>
          {order.discount > 0 ? (
            <div className="flex justify-between text-[#555555]">
              <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
              <dd className="text-[#8fbf8f]">−{formatTaka(order.discount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-[#555555]">
            <dt>Shipping</dt>
            <dd>{order.shipping === 0 ? 'Free' : formatTaka(order.shipping)}</dd>
          </div>
          <div className="flex justify-between pt-2 font-semibold text-[#111111]">
            <dt>Total</dt>
            <dd className="text-[#C9A227]">{formatTaka(order.total)}</dd>
          </div>
        </dl>
      </AdminPanel>

      {(canProcess || canPack || canShip || canDeliver || canCancel) && (
        <AdminPanel
          title="Fulfillment actions"
          description="Advance status or cancel before shipment."
        >
          {actionError ? <AdminError>{actionError}</AdminError> : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {canProcess ? (
              <AdminButton
                type="button"
                disabled={busy}
                loading={statusMutation.isPending}
                onClick={() => void runStatus('PROCESSING')}
              >
                Process
              </AdminButton>
            ) : null}

            {canPack ? (
              <AdminButton
                type="button"
                disabled={busy}
                loading={statusMutation.isPending}
                onClick={() => void runStatus('PACKED')}
              >
                Mark packed
              </AdminButton>
            ) : null}

            {canDeliver ? (
              <AdminButton
                type="button"
                disabled={busy}
                loading={statusMutation.isPending}
                onClick={() => void runStatus('DELIVERED')}
              >
                Deliver
              </AdminButton>
            ) : null}
          </div>

          {canShip ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
                  Tracking number
                </span>
                <AdminInput
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  placeholder="TRK…"
                  autoComplete="off"
                  disabled={busy}
                />
              </label>
              <AdminButton
                type="button"
                disabled={busy || trackingNumber.trim().length < 4}
                loading={statusMutation.isPending}
                onClick={() => void runStatus('SHIPPED', trackingNumber.trim())}
              >
                Ship
              </AdminButton>
            </div>
          ) : null}

          {canCancel ? (
            <div className="mt-4 space-y-3 border-t border-[#E5E7EB] pt-4">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
                  Cancel reason
                </span>
                <AdminTextarea
                  rows={3}
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Required — why is this order being cancelled?"
                  disabled={busy}
                />
              </label>
              <AdminButton
                type="button"
                variant="danger"
                disabled={busy || cancelReason.trim().length < 3}
                loading={cancelMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Cancel order #${order.number}? This cannot be undone.`)) {
                    void runCancel();
                  }
                }}
              >
                Cancel order
              </AdminButton>
            </div>
          ) : null}
        </AdminPanel>
      )}
    </div>
  );
}

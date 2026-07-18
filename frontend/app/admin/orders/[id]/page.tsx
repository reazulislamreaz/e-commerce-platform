'use client';

import axios from 'axios';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  AdminButton,
  AdminError,
  AdminInput,
  AdminPanel,
  AdminTextarea,
  StatusPill,
} from '@/components/admin/admin-ui';
import { adminApi, useAdminMutation, useAdminOrder } from '@/features/admin';
import { formatTaka } from '@/lib/currency';

function mutationErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

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
      status: 'PROCESSING' | 'SHIPPED' | 'DELIVERED';
      trackingNumber?: string;
    }) =>
      adminApi.updateOrderStatus(args.id, {
        status: args.status,
        ...(args.trackingNumber ? { trackingNumber: args.trackingNumber } : {}),
      }),
  );

  const cancelMutation = useAdminMutation((args: { id: string; reason: string }) =>
    adminApi.cancelOrder(args.id, args.reason),
  );

  const busy = statusMutation.isPending || cancelMutation.isPending;

  async function runStatus(status: 'PROCESSING' | 'SHIPPED' | 'DELIVERED', tracking?: string) {
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
    return <p className="py-8 text-center text-sm text-[#b5b0a8]">Loading order…</p>;
  }

  if (orderQuery.isError || !order) {
    return (
      <div className="space-y-3">
        <AdminError>Order not found or failed to load.</AdminError>
        <Link
          href="/admin/orders"
          className="inline-block text-[10px] font-bold uppercase tracking-[.08em] text-[#e3bb78]"
        >
          Back to orders
        </Link>
      </div>
    );
  }

  const status = order.status;
  const canProcess = status === 'confirmed';
  const canShip = status === 'processing';
  const canDeliver = status === 'shipped';
  const canCancel = status === 'confirmed' || status === 'processing';
  const address = order.shippingAddress;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/orders"
          className="text-[10px] font-bold uppercase tracking-[.08em] text-[#e3bb78] hover:text-[#eec98a]"
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
            <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Buyer email
            </dt>
            <dd className="mt-1 text-white">{order.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Tracking
            </dt>
            <dd className="mt-1 text-[#e3bb78]">{order.trackingNumber ?? 'Not set'}</dd>
          </div>
        </dl>

        <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {order.timeline.map((step) => (
            <li
              key={`${step.label}-${step.at}`}
              className={`rounded-[4px] border px-3 py-2 text-[11px] ${
                step.done
                  ? 'border-[#e5bd79]/40 bg-[#1a1815] text-[#e3bb78]'
                  : 'border-[#2d2a27] text-[#8b867d]'
              }`}
            >
              <p className="font-semibold">{step.label}</p>
              <p className="mt-0.5 text-[10px] opacity-80">
                {step.at ? new Date(step.at).toLocaleString() : '—'}
              </p>
            </li>
          ))}
        </ol>
      </AdminPanel>

      <AdminPanel title="Shipping address">
        <div className="text-sm text-[#e9e5de]">
          <p className="font-semibold text-white">{address.fullName}</p>
          <p className="mt-1 text-[#b5b0a8]">{address.phone}</p>
          <p className="mt-2 text-[#b5b0a8]">
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ''}
          </p>
          <p className="text-[#b5b0a8]">
            {address.city}, {address.district} {address.postalCode}
          </p>
          <p className="text-[#b5b0a8]">{address.country}</p>
        </div>
      </AdminPanel>

      <AdminPanel title="Items">
        <ul className="space-y-3">
          {order.items.map((item) => (
            <li
              key={`${item.productId}-${item.size}-${item.color}`}
              className="flex gap-3 border-b border-[#2d2a27]/60 pb-3 last:border-0 last:pb-0"
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
                <p className="font-medium text-white">{item.name}</p>
                <p className="text-[12px] text-[#8b867d]">
                  {item.color} / {item.size} × {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold text-[#e3bb78]">
                {formatTaka(item.unitPrice * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-1 border-t border-[#2d2a27] pt-4 text-sm">
          <div className="flex justify-between text-[#b5b0a8]">
            <dt>Subtotal</dt>
            <dd>{formatTaka(order.subtotal)}</dd>
          </div>
          {order.discount > 0 ? (
            <div className="flex justify-between text-[#b5b0a8]">
              <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
              <dd className="text-[#8fbf8f]">−{formatTaka(order.discount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-[#b5b0a8]">
            <dt>Shipping</dt>
            <dd>{order.shipping === 0 ? 'Free' : formatTaka(order.shipping)}</dd>
          </div>
          <div className="flex justify-between pt-2 font-semibold text-white">
            <dt>Total</dt>
            <dd className="text-[#e3bb78]">{formatTaka(order.total)}</dd>
          </div>
        </dl>
      </AdminPanel>

      {(canProcess || canShip || canDeliver || canCancel) && (
        <AdminPanel title="Fulfillment actions" description="Advance status or cancel before shipment.">
          {actionError ? <AdminError>{actionError}</AdminError> : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {canProcess ? (
              <AdminButton
                type="button"
                disabled={busy}
                onClick={() => void runStatus('PROCESSING')}
              >
                Process
              </AdminButton>
            ) : null}

            {canDeliver ? (
              <AdminButton
                type="button"
                disabled={busy}
                onClick={() => void runStatus('DELIVERED')}
              >
                Deliver
              </AdminButton>
            ) : null}
          </div>

          {canShip ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
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
                onClick={() => void runStatus('SHIPPED', trackingNumber.trim())}
              >
                Ship
              </AdminButton>
            </div>
          ) : null}

          {canCancel ? (
            <div className="mt-4 space-y-3 border-t border-[#2d2a27] pt-4">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
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
                onClick={() => void runCancel()}
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

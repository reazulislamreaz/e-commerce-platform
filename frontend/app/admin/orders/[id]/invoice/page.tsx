'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Printer, ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/shared/brand-logo';
import { useAdminOrder } from '@/features/admin';
import { formatTaka } from '@/lib/currency';

export default function OrderInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') === 'packing' ? 'packing' : 'tax';

  const orderQuery = useAdminOrder(id);
  const order = orderQuery.data;

  if (orderQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-8">
        <p className="text-sm font-semibold text-[#555555]">Loading document...</p>
      </div>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-8">
        <p className="text-sm font-semibold text-red-600">Order not found.</p>
      </div>
    );
  }

  const address = order.shippingAddress;
  const shipment = order.shipment;

  return (
    <div className="min-h-screen bg-white p-4 sm:p-8 text-[#111111] print:p-0">
      {/* Top Action Bar (Hidden on print) */}
      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between border-b border-[#E5E7EB] pb-4 print:hidden">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#555555] hover:text-[#111111]"
        >
          <ArrowLeft className="size-4" strokeWidth={1.7} />
          Back
        </button>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-1 text-xs font-semibold">
            <a
              href={`/admin/orders/${order.id}/invoice?type=tax`}
              className={`rounded px-3 py-1 ${
                type === 'tax' ? 'bg-[#111111] text-white' : 'text-[#555555] hover:text-[#111111]'
              }`}
            >
              Tax Invoice
            </a>
            <a
              href={`/admin/orders/${order.id}/invoice?type=packing`}
              className={`rounded px-3 py-1 ${
                type === 'packing'
                  ? 'bg-[#111111] text-white'
                  : 'text-[#555555] hover:text-[#111111]'
              }`}
            >
              Packing Slip
            </a>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#111111] px-4 py-2 text-xs font-bold uppercase tracking-[.08em] text-white hover:bg-[#C9A227] hover:text-[#111111] transition-colors"
          >
            <Printer className="size-4" strokeWidth={1.7} />
            Print
          </button>
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div className="mx-auto max-w-4xl border border-[#E5E7EB] p-8 print:border-0 print:p-0">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-[#E5E7EB] pb-6">
          <div>
            <BrandLogo on="light" className="mb-2" />
            <p className="text-xs text-[#555555]">Elevate Apparel Ltd.</p>
            <p className="text-xs text-[#555555]">House 42, Road 11, Banani, Dhaka, Bangladesh</p>
            <p className="text-xs text-[#555555]">
              Support: +880 9610 000 000 | support@elevateapparel.com
            </p>
          </div>

          <div className="text-right">
            <h1 className="text-2xl font-black uppercase tracking-wider text-[#111111]">
              {type === 'packing' ? 'PACKING SLIP' : 'TAX INVOICE'}
            </h1>
            <p className="mt-1 text-sm font-bold text-[#C9A227]">Order #{order.number}</p>
            <p className="mt-0.5 text-xs text-[#555555]">
              Date: {new Date(order.createdAt).toLocaleDateString()}
            </p>
            <p className="text-xs text-[#555555]">
              Payment:{' '}
              <span className="font-semibold uppercase text-[#111111]">{order.paymentMethod}</span>{' '}
              ({order.paymentStatus || 'PENDING'})
            </p>
          </div>
        </div>

        {/* Addresses & Logistics */}
        <div className="grid grid-cols-2 gap-6 border-b border-[#E5E7EB] py-6 text-xs">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#555555]">
              Billed & Shipped To:
            </p>
            <p className="font-bold text-[#111111]">{address.fullName}</p>
            <p className="text-[#555555]">Phone: {address.phone || order.phone || '—'}</p>
            <p className="text-[#555555]">Email: {order.email || '—'}</p>
            <p className="mt-2 text-[#555555]">
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ''}
              <br />
              {address.city}, {address.district} {address.postalCode}
              <br />
              {address.country}
            </p>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#555555]">
              Shipment Information:
            </p>
            <p className="text-[#111111]">
              Carrier:{' '}
              <span className="font-semibold">
                {shipment?.deliveryPartnerName || shipment?.carrier || 'Standard Logistics'}
              </span>
            </p>
            <p className="text-[#111111]">
              Tracking #:{' '}
              <span className="font-semibold">
                {order.trackingNumber || shipment?.trackingNumber || 'Pending'}
              </span>
            </p>
            {shipment?.estimatedDeliveryAt ? (
              <p className="text-[#555555]">
                Est. Delivery: {new Date(shipment.estimatedDeliveryAt).toLocaleDateString()}
              </p>
            ) : null}
          </div>
        </div>

        {/* Items Table */}
        <div className="py-6">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#111111] text-[10px] uppercase tracking-wider text-[#555555]">
                <th className="py-2 font-bold">Item Description</th>
                <th className="py-2 font-bold">Variant</th>
                {type === 'tax' ? <th className="py-2 text-right font-bold">Unit Price</th> : null}
                <th className="py-2 text-center font-bold">Qty</th>
                {type === 'tax' ? <th className="py-2 text-right font-bold">Total</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {order.items.map((item, i) => (
                <tr key={i}>
                  <td className="py-3">
                    <p className="font-bold text-[#111111]">{item.name}</p>
                    {item.sku ? (
                      <p className="text-[10px] text-[#555555]">SKU: {item.sku}</p>
                    ) : null}
                  </td>
                  <td className="py-3 text-[#555555]">
                    Size: {item.size} | Color: {item.color}
                  </td>
                  {type === 'tax' ? (
                    <td className="py-3 text-right font-medium text-[#111111]">
                      {formatTaka(item.unitPrice)}
                    </td>
                  ) : null}
                  <td className="py-3 text-center font-bold text-[#111111]">{item.quantity}</td>
                  {type === 'tax' ? (
                    <td className="py-3 text-right font-bold text-[#111111]">
                      {formatTaka(item.lineTotal ?? item.unitPrice * item.quantity)}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Totals (Tax Invoice Only) */}
        {type === 'tax' ? (
          <div className="flex justify-end border-t border-[#E5E7EB] pt-4">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-[#555555]">
                <span>Subtotal</span>
                <span className="font-medium text-[#111111]">{formatTaka(order.subtotal)}</span>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between text-[#555555]">
                  <span>Discount</span>
                  <span className="font-medium text-[#111111]">−{formatTaka(order.discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-[#555555]">
                <span>Shipping</span>
                <span className="font-medium text-[#111111]">
                  {order.shipping === 0 ? 'Free' : formatTaka(order.shipping)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#111111] pt-2 text-sm font-extrabold text-[#111111]">
                <span>Grand Total</span>
                <span className="text-[#C9A227]">{formatTaka(order.total)}</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer Notice */}
        <div className="mt-12 border-t border-[#E5E7EB] pt-4 text-center text-[10px] text-[#555555]">
          <p className="font-semibold text-[#111111]">
            Thank you for shopping with Elevate Apparel.
          </p>
          <p className="mt-0.5">
            For returns or customer care, please visit elevateapparel.com or call +880 9610 000 000.
          </p>
        </div>
      </div>
    </div>
  );
}

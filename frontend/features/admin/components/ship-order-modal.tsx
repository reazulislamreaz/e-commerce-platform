'use client';

import { useState } from 'react';
import { AdminModal } from '@/components/admin/admin-modal';
import {
  AdminButton,
  AdminError,
  AdminField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from '@/components/admin/admin-ui';
import { useActiveDeliveryPartners, type DeliveryPartner } from '@/features/admin';

type ShipOrderModalProps = {
  open: boolean;
  orderNumbers?: string[];
  count: number;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (data: {
    deliveryPartnerId?: string;
    trackingNumber: string;
    trackingUrl?: string;
    shippingNote?: string;
    estimatedDeliveryAt?: string;
  }) => Promise<void>;
};

export function ShipOrderModal({
  open,
  orderNumbers = [],
  count,
  loading = false,
  onClose,
  onConfirm,
}: ShipOrderModalProps) {
  const activePartnersQuery = useActiveDeliveryPartners();
  const partners = activePartnersQuery.data ?? [];

  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [shippingNote, setShippingNote] = useState('');
  const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState('');
  const [error, setError] = useState('');

  function handlePartnerChange(partnerId: string) {
    setSelectedPartnerId(partnerId);
    if (!partnerId) return;

    const partner = partners.find((p) => p.id === partnerId);
    if (partner?.trackingUrlTemplate && trackingNumber) {
      setTrackingUrl(
        partner.trackingUrlTemplate.replace('{trackingNumber}', trackingNumber.trim()),
      );
    }
  }

  function handleTrackingNumberChange(num: string) {
    setTrackingNumber(num);
    if (!selectedPartnerId) return;
    const partner = partners.find((p) => p.id === selectedPartnerId);
    if (partner?.trackingUrlTemplate) {
      setTrackingUrl(partner.trackingUrlTemplate.replace('{trackingNumber}', num.trim()));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      setError('Tracking number is required to ship order(s)');
      return;
    }
    if (trackingNumber.trim().length < 4) {
      setError('Tracking number must be at least 4 characters');
      return;
    }
    setError('');

    try {
      await onConfirm({
        deliveryPartnerId: selectedPartnerId || undefined,
        trackingNumber: trackingNumber.trim(),
        trackingUrl: trackingUrl.trim() || undefined,
        shippingNote: shippingNote.trim() || undefined,
        estimatedDeliveryAt: estimatedDeliveryAt
          ? new Date(estimatedDeliveryAt).toISOString()
          : undefined,
      });
      // Reset form
      setSelectedPartnerId('');
      setTrackingNumber('');
      setTrackingUrl('');
      setShippingNote('');
      setEstimatedDeliveryAt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shipping details');
    }
  }

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={`Ship ${count === 1 ? (orderNumbers[0] ? `#${orderNumbers[0]}` : 'Order') : `${count} Orders`}`}
      size="lg"
      dismissDisabled={loading}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-[#555555]">
          Assign delivery partner, add tracking information, and notify customer(s) by email.
        </p>

        {error ? <AdminError>{error}</AdminError> : null}

        <AdminField
          label="Delivery Partner"
          hint="Select registered courier for Bangladesh fulfillment"
        >
          <AdminSelect
            value={selectedPartnerId}
            onChange={(e) => handlePartnerChange(e.target.value)}
          >
            <option value="">Manual / Unlisted Carrier</option>
            {partners.map((partner: DeliveryPartner) => (
              <option key={partner.id} value={partner.id}>
                {partner.companyName} {partner.phone ? `(${partner.phone})` : ''}
              </option>
            ))}
          </AdminSelect>
        </AdminField>

        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Tracking Number *" hint="Consignment ID / Waybill number">
            <AdminInput
              required
              placeholder="e.g. PTH-94827104"
              value={trackingNumber}
              onChange={(e) => handleTrackingNumberChange(e.target.value)}
            />
          </AdminField>

          <AdminField label="Estimated Delivery Date" hint="Optional expected arrival date">
            <AdminInput
              type="date"
              value={estimatedDeliveryAt}
              onChange={(e) => setEstimatedDeliveryAt(e.target.value)}
            />
          </AdminField>
        </div>

        <AdminField
          label="Tracking Link URL"
          hint="Auto-generated if delivery partner template exists"
        >
          <AdminInput
            placeholder="https://pathao.com/track/PTH-94827104"
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
          />
        </AdminField>

        <AdminField label="Shipping Note" hint="Internal fulfillment note or special instructions">
          <AdminTextarea
            rows={2}
            placeholder="e.g. Handed over to Pathao Hub at Gulshan"
            value={shippingNote}
            onChange={(e) => setShippingNote(e.target.value)}
          />
        </AdminField>

        <div className="flex justify-end gap-2 pt-2">
          <AdminButton variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" loading={loading} disabled={loading}>
            Confirm Shipment
          </AdminButton>
        </div>
      </form>
    </AdminModal>
  );
}

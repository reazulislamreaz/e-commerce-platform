import { AdminTableSkeleton } from '@/components/common/skeleton';
import { AdminPageHeader, AdminPanel } from '@/components/admin/admin-ui';

export default function DeliveryPartnersLoading() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Delivery Partners"
        description="Manage courier services, integration keys, and shipment tracking URL templates."
      />
      <AdminPanel
        title="Partner Directory"
        description="Configure active shipping carriers for admin order fulfillment."
      >
        <AdminTableSkeleton rows={6} />
      </AdminPanel>
    </div>
  );
}

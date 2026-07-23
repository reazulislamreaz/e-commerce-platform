import { AdminTableSkeleton } from '@/components/common/skeleton';
import { AdminPageHeader, AdminPanel } from '@/components/admin/admin-ui';

export default function OrdersLoading() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Orders Directory"
        description="Track, filter, export, and fulfill customer orders."
      />
      <AdminPanel
        title="Order Queue"
        description="Filter fulfillment queue by status, partner, payment method, date range, or customer details."
      >
        <AdminTableSkeleton rows={8} />
      </AdminPanel>
    </div>
  );
}

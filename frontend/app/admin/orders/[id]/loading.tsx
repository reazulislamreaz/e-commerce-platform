import { AdminSkeleton } from '@/components/admin/admin-ui';

export default function OrderDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <AdminSkeleton className="h-8 w-48" />
        <AdminSkeleton className="h-8 w-32" />
      </div>
      <AdminSkeleton className="h-28 w-full" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AdminSkeleton className="h-72 w-full" />
          <AdminSkeleton className="h-48 w-full" />
        </div>
        <div className="space-y-6">
          <AdminSkeleton className="h-60 w-full" />
          <AdminSkeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}

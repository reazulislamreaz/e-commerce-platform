'use client';

import { Suspense } from 'react';
import { AdminTableSkeleton } from '@/components/common/skeleton';
import { OrdersDirectory } from '@/features/admin/components/orders-directory';

export default function PackedOrdersPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton />}>
      <OrdersDirectory lockedStatus="PACKED" />
    </Suspense>
  );
}

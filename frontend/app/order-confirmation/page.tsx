import { Suspense } from 'react';
import { OrderSuccessSkeleton } from '@/components/loading';
import { OrderSuccess } from './order-success';

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<OrderSuccessSkeleton />}>
      <OrderSuccess />
    </Suspense>
  );
}

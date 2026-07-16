import { OrderRequestForm } from '@/components/account/order-request-form';

export default function ReturnsPage() {
  return (
    <OrderRequestForm
      type="return"
      title="Return Request"
      reasonLabel="Reason"
      submitLabel="Submit Return"
      listTitle="Your Returns"
      emptyMessage="No return requests yet."
    />
  );
}

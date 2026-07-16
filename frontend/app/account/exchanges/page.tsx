import { OrderRequestForm } from '@/components/account/order-request-form';

export default function ExchangesPage() {
  return (
    <OrderRequestForm
      type="exchange"
      title="Exchange Request"
      reasonLabel="What would you like to exchange?"
      submitLabel="Submit Exchange"
      listTitle="Your Exchanges"
      emptyMessage="No exchange requests yet."
    />
  );
}

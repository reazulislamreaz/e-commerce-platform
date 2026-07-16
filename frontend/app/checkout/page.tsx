import type { Metadata } from 'next';
import { CheckoutClient } from './checkout-client';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your Elevate Apparel order.',
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}

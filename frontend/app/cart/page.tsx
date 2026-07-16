import type { Metadata } from 'next';
import { CartClient } from './cart-client';

export const metadata: Metadata = {
  title: 'Cart',
  description: 'Your Elevate Apparel shopping bag.',
};

export default function CartPage() {
  return <CartClient />;
}

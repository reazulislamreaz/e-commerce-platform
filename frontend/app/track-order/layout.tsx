import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Order',
  description: 'Track your Elevate Apparel order status with your order number.',
};

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}

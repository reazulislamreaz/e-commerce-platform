import type { Metadata } from 'next';
import { WishlistPageClient } from './wishlist-client';

export const metadata: Metadata = {
  title: 'Wishlist',
  description: 'Your saved Elevate Apparel pieces.',
};

export default function WishlistPage() {
  return <WishlistPageClient />;
}

'use client';

import { WishlistGrid } from '@/components/shared/wishlist-grid';

export default function AccountWishlistPage() {
  return (
    <WishlistGrid title="Wishlist" showClear emptyHint="Your wishlist is empty." />
  );
}

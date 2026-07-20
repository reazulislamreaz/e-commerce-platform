import { redirect } from 'next/navigation';

/** Canonical wishlist route is `/wishlist` (header + mobile bottom nav). */
export default function AccountWishlistRedirectPage() {
  redirect('/wishlist');
}

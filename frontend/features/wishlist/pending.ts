import { readStorage, writeStorage, removeStorage } from '@/lib/storage';

const PENDING_KEY = 'pendingWishlist';

/**
 * Holds wishlist product ids a guest tried to save before signing in. The
 * intent survives the login redirect and is completed automatically after a
 * successful login (Fabrilife behavior: "save, sign in, then it's added").
 * Nothing is added to the wishlist until the user is authenticated.
 */
export function readPendingWishlist(): string[] {
  const value = readStorage<string[]>(PENDING_KEY, []);
  return Array.isArray(value) ? value : [];
}

export function addPendingWishlist(productId: string): void {
  const current = readPendingWishlist();
  if (!current.includes(productId)) {
    writeStorage(PENDING_KEY, [...current, productId]);
  }
}

export function clearPendingWishlist(): void {
  removeStorage(PENDING_KEY);
}

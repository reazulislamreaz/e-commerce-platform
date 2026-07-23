import { readStorage, writeStorage, removeStorage } from '@/lib/storage';

const COUPON_KEY = 'coupon';

/**
 * Lightweight persistence for the last successfully-applied coupon code.
 *
 * Only the code string is stored — the discount/shipping effect is always
 * re-validated server-side against the current bag on checkout, so a coupon is
 * restored only while it is still valid. Coupons remain login-gated; this never
 * changes that business rule, it just keeps a valid coupon from being lost on a
 * page refresh (matching Fabrilife's persistent cart).
 */
export function readAppliedCoupon(): string | null {
  const code = readStorage<string | null>(COUPON_KEY, null);
  return typeof code === 'string' && code.trim() ? code : null;
}

export function writeAppliedCoupon(code: string): void {
  writeStorage(COUPON_KEY, code);
}

export function clearAppliedCoupon(): void {
  removeStorage(COUPON_KEY);
}

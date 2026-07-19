export const CART_RECOVERY_QUEUE = 'cart-recovery';
export const CART_RECOVERY_JOB = 'send-abandoned-cart-reminder';
export const CART_RECOVERY_SCAN_JOB = 'scan-abandoned-carts';
export const CART_IDLE_MS = 60 * 60 * 1000;
export const SECOND_REMINDER_DELAY_MS = 24 * 60 * 60 * 1000;
export const MAX_CART_REMINDERS = 2;

export type CartRecoveryJob = {
  recoveryId: string;
};

export type RecoveryEligibilityInput = {
  updatedAt: Date;
  itemCount: number;
  email: string | null;
};

export function isCartRecoveryEligible(
  input: RecoveryEligibilityInput,
  now: Date,
): boolean {
  return (
    input.itemCount > 0 &&
    Boolean(input.email) &&
    input.updatedAt.getTime() <= now.getTime() - CART_IDLE_MS
  );
}

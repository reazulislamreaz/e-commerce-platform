import { CartRecoveryStatus } from '@/generated/prisma/client';
import { shouldResetRecovery } from './cart-recovery.service';
import { CART_IDLE_MS, isCartRecoveryEligible, MAX_CART_REMINDERS } from './cart-recovery.types';

describe('abandoned cart eligibility', () => {
  const now = new Date('2026-07-19T04:00:00.000Z');

  it('accepts a cart with email and items idle for at least one hour', () => {
    expect(
      isCartRecoveryEligible(
        {
          updatedAt: new Date(now.getTime() - CART_IDLE_MS),
          itemCount: 2,
          email: 'customer@example.com',
        },
        now,
      ),
    ).toBe(true);
  });

  it('rejects active, empty, and addressless carts', () => {
    expect(
      isCartRecoveryEligible(
        { updatedAt: new Date(now.getTime() - CART_IDLE_MS + 1), itemCount: 1, email: 'a@b.com' },
        now,
      ),
    ).toBe(false);
    expect(
      isCartRecoveryEligible(
        { updatedAt: new Date(now.getTime() - CART_IDLE_MS), itemCount: 0, email: 'a@b.com' },
        now,
      ),
    ).toBe(false);
    expect(
      isCartRecoveryEligible(
        { updatedAt: new Date(now.getTime() - CART_IDLE_MS), itemCount: 1, email: null },
        now,
      ),
    ).toBe(false);
  });
});

describe('abandoned cart recovery reset', () => {
  const sentAt = new Date('2026-07-18T00:00:00.000Z');

  it('resets exhausted SENT recoveries after the cart is mutated again', () => {
    expect(
      shouldResetRecovery(
        {
          status: CartRecoveryStatus.SENT,
          reminderCount: MAX_CART_REMINDERS,
          lastSentAt: sentAt,
          suppressedAt: null,
          convertedAt: null,
          createdAt: sentAt,
        },
        new Date(sentAt.getTime() + 60_000),
      ),
    ).toBe(true);
  });

  it('does not reset mid-sequence SENT recoveries on snapshot-only upserts', () => {
    expect(
      shouldResetRecovery(
        {
          status: CartRecoveryStatus.SENT,
          reminderCount: 1,
          lastSentAt: sentAt,
          suppressedAt: null,
          convertedAt: null,
          createdAt: sentAt,
        },
        sentAt,
      ),
    ).toBe(false);
  });

  it('resets CONVERTED recoveries when the cart is reused and abandoned again', () => {
    expect(
      shouldResetRecovery(
        {
          status: CartRecoveryStatus.CONVERTED,
          reminderCount: 1,
          lastSentAt: sentAt,
          suppressedAt: null,
          convertedAt: sentAt,
          createdAt: sentAt,
        },
        new Date(sentAt.getTime() + 1),
      ),
    ).toBe(true);
  });
});

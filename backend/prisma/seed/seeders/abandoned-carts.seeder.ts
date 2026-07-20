import { CartRecoveryStatus } from '../../../src/generated/prisma/client';
import { seedUuid } from '../utils/ids';
import type { SeedContext } from '../types';
import { seedLog } from '../utils/logger';

/** Demo abandoned-cart recovery rows for carts that still have items. */
export async function seedAbandonedCarts(ctx: SeedContext): Promise<void> {
  const { prisma, users } = ctx;
  const targets = users.customers.slice(0, 2);
  let created = 0;

  for (const customer of targets) {
    const cart = await prisma.cart.findUnique({
      where: { userId: customer.id },
      select: {
        id: true,
        items: {
          select: {
            productId: true,
            variantId: true,
            quantity: true,
            size: true,
            color: true,
          },
        },
      },
    });
    if (!cart || cart.items.length === 0) continue;

    await prisma.abandonedCartRecovery.upsert({
      where: { cartId: cart.id },
      create: {
        id: seedUuid(`cart-recovery:${customer.email}`),
        cartId: cart.id,
        userId: customer.id,
        email: customer.email,
        status: CartRecoveryStatus.PENDING,
        reminderCount: 0,
        nextSendAt: new Date('2026-07-21T09:00:00.000Z'),
        cartSnapshot: { items: cart.items },
      },
      update: {
        email: customer.email,
        status: CartRecoveryStatus.PENDING,
        cartSnapshot: { items: cart.items },
        suppressedAt: null,
        convertedAt: null,
      },
    });
    created += 1;
  }

  seedLog(`Seeded ${created} abandoned-cart recovery records.`);
}

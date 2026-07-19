import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CartRecoveryStatus, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { Queue } from 'bullmq';
import {
  CART_IDLE_MS,
  CART_RECOVERY_JOB,
  CART_RECOVERY_QUEUE,
  CART_RECOVERY_SCAN_JOB,
  MAX_CART_REMINDERS,
  type CartRecoveryJob,
  isCartRecoveryEligible,
} from './cart-recovery.types';

const SCAN_BATCH = 200;

@Injectable()
export class CartRecoveryService implements OnModuleInit {
  private readonly logger = new Logger(CartRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(CART_RECOVERY_QUEUE)
    private readonly queue: Queue<CartRecoveryJob | Record<string, never>>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queue.add(
      CART_RECOVERY_SCAN_JOB,
      {},
      {
        jobId: `repeat:${CART_RECOVERY_SCAN_JOB}`,
        repeat: { every: 5 * 60 * 1000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      },
    );
    this.logger.log('Abandoned-cart scan job registered');
  }

  async scan(now = new Date()): Promise<number> {
    const idleBefore = new Date(now.getTime() - CART_IDLE_MS);

    // Age out exhausted sends so they leave the active scan window.
    await this.prisma.abandonedCartRecovery.updateMany({
      where: {
        status: CartRecoveryStatus.SENT,
        reminderCount: { gte: MAX_CART_REMINDERS },
      },
      data: {
        status: CartRecoveryStatus.EXPIRED,
        suppressedAt: now,
      },
    });

    const emailFilter: Prisma.CartWhereInput = {
      OR: [{ recoveryEmail: { not: null } }, { user: { email: { not: '' } } }],
    };

    // Active / never-started recoveries — exclude terminal rows so stuck carts
    // cannot starve newer abandonments inside the fixed take window.
    const activeCarts = await this.prisma.cart.findMany({
      where: {
        updatedAt: { lte: idleBefore },
        items: { some: {} },
        AND: [
          emailFilter,
          {
            OR: [
              { recoveries: { none: {} } },
              {
                recoveries: {
                  some: {
                    status: { in: [CartRecoveryStatus.PENDING, CartRecoveryStatus.SENT] },
                    reminderCount: { lt: MAX_CART_REMINDERS },
                  },
                },
              },
            ],
          },
        ],
      },
      select: cartScanSelect,
      orderBy: { updatedAt: 'asc' },
      take: SCAN_BATCH,
    });

    // Terminal recoveries that became resettable after the cart was mutated again.
    const terminalRecoveries = await this.prisma.abandonedCartRecovery.findMany({
      where: {
        status: {
          in: [
            CartRecoveryStatus.SUPPRESSED,
            CartRecoveryStatus.CONVERTED,
            CartRecoveryStatus.EXPIRED,
          ],
        },
        cart: {
          updatedAt: { lte: idleBefore },
          items: { some: {} },
          AND: [emailFilter],
        },
      },
      select: {
        id: true,
        status: true,
        reminderCount: true,
        lastSentAt: true,
        suppressedAt: true,
        convertedAt: true,
        createdAt: true,
        cart: { select: cartScanSelect },
      },
      orderBy: { cart: { updatedAt: 'asc' } },
      take: SCAN_BATCH,
    });

    const resetCarts = terminalRecoveries
      .filter((recovery) => shouldResetRecovery(recovery, recovery.cart.updatedAt))
      .map((recovery) => recovery.cart);

    const seen = new Set<string>();
    const carts = [...activeCarts, ...resetCarts].filter((cart) => {
      if (seen.has(cart.id)) return false;
      seen.add(cart.id);
      return true;
    });

    let scheduled = 0;
    for (const cart of carts) {
      const email = cart.user?.email ?? cart.recoveryEmail;
      if (
        !isCartRecoveryEligible(
          { updatedAt: cart.updatedAt, itemCount: cart.items.length, email },
          now,
        )
      ) {
        continue;
      }

      const existing = cart.recoveries[0];
      const shouldReset = existing ? shouldResetRecovery(existing, cart.updatedAt) : false;

      if (
        existing &&
        !shouldReset &&
        (existing.status === CartRecoveryStatus.PENDING ||
          existing.status === CartRecoveryStatus.SENT) &&
        (existing.reminderCount >= MAX_CART_REMINDERS || existing.nextSendAt > now)
      ) {
        continue;
      }

      if (
        existing &&
        !shouldReset &&
        (existing.status === CartRecoveryStatus.SUPPRESSED ||
          existing.status === CartRecoveryStatus.CONVERTED ||
          existing.status === CartRecoveryStatus.EXPIRED)
      ) {
        continue;
      }

      const snapshot = cart.items.map((item) => ({
        productId: item.productId,
        name: item.variant.product.name,
        slug: item.variant.product.slug,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        unitPricePoisha: item.variant.product.currentPriceAmount.toString(),
      }));

      const recovery = await this.prisma.abandonedCartRecovery.upsert({
        where: { cartId: cart.id },
        create: {
          cartId: cart.id,
          userId: cart.userId,
          email: email!,
          nextSendAt: now,
          cartSnapshot: snapshot as Prisma.InputJsonValue,
        },
        update: {
          email: email!,
          userId: cart.userId,
          cartSnapshot: snapshot as Prisma.InputJsonValue,
          ...(shouldReset
            ? {
                status: CartRecoveryStatus.PENDING,
                reminderCount: 0,
                nextSendAt: now,
                suppressedAt: null,
                convertedAt: null,
                lastSentAt: null,
              }
            : {}),
        },
      });

      if (
        (recovery.status === CartRecoveryStatus.PENDING ||
          recovery.status === CartRecoveryStatus.SENT) &&
        recovery.reminderCount < MAX_CART_REMINDERS &&
        recovery.nextSendAt <= now
      ) {
        await this.queue.add(
          CART_RECOVERY_JOB,
          { recoveryId: recovery.id },
          {
            jobId: `${recovery.id}-${recovery.reminderCount + 1}`,
            attempts: 5,
            backoff: { type: 'exponential', delay: 5_000 },
            removeOnComplete: { age: 24 * 60 * 60 },
            removeOnFail: { age: 7 * 24 * 60 * 60 },
          },
        );
        scheduled += 1;
      }
    }
    return scheduled;
  }

  async suppressForCart(
    cartId: string,
    tx: Prisma.TransactionClient,
    converted = false,
  ): Promise<void> {
    const now = new Date();
    await tx.abandonedCartRecovery.updateMany({
      where: {
        cartId,
        status: { in: [CartRecoveryStatus.PENDING, CartRecoveryStatus.SENT] },
      },
      data: converted
        ? { status: CartRecoveryStatus.CONVERTED, convertedAt: now }
        : { status: CartRecoveryStatus.SUPPRESSED, suppressedAt: now },
    });
  }
}

const cartScanSelect = {
  id: true,
  userId: true,
  recoveryEmail: true,
  updatedAt: true,
  user: { select: { email: true } },
  recoveries: {
    select: {
      id: true,
      status: true,
      reminderCount: true,
      nextSendAt: true,
      lastSentAt: true,
      suppressedAt: true,
      convertedAt: true,
      createdAt: true,
    },
    take: 1,
  },
  items: {
    select: {
      quantity: true,
      size: true,
      color: true,
      productId: true,
      variant: {
        select: {
          product: { select: { name: true, slug: true, currentPriceAmount: true } },
        },
      },
    },
  },
} satisfies Prisma.CartSelect;

type RecoveryTouch = {
  status: CartRecoveryStatus;
  reminderCount: number;
  lastSentAt: Date | null;
  suppressedAt: Date | null;
  convertedAt: Date | null;
  createdAt: Date;
};

/**
 * Reset when the cart was mutated after the recovery reached a terminal or
 * exhausted state — compares against status timestamps, not Prisma `updatedAt`
 * (which bumps on every scan upsert of the snapshot).
 */
export function shouldResetRecovery(recovery: RecoveryTouch, cartUpdatedAt: Date): boolean {
  const touchAt =
    recovery.status === CartRecoveryStatus.CONVERTED
      ? recovery.convertedAt
      : recovery.status === CartRecoveryStatus.SUPPRESSED ||
          recovery.status === CartRecoveryStatus.EXPIRED
        ? recovery.suppressedAt
        : recovery.lastSentAt;

  if (!touchAt) {
    return (
      (recovery.status === CartRecoveryStatus.SENT &&
        recovery.reminderCount >= MAX_CART_REMINDERS) ||
      recovery.status === CartRecoveryStatus.SUPPRESSED ||
      recovery.status === CartRecoveryStatus.CONVERTED ||
      recovery.status === CartRecoveryStatus.EXPIRED
    );
  }

  if (cartUpdatedAt.getTime() <= touchAt.getTime()) {
    return false;
  }

  return (
    recovery.status === CartRecoveryStatus.SUPPRESSED ||
    recovery.status === CartRecoveryStatus.CONVERTED ||
    recovery.status === CartRecoveryStatus.EXPIRED ||
    (recovery.status === CartRecoveryStatus.SENT &&
      recovery.reminderCount >= MAX_CART_REMINDERS)
  );
}

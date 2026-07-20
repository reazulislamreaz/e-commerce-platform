import {
  CustomerSegmentKey,
  PaymentStatus,
} from '../../../src/generated/prisma/client';
import type { SeedContext } from '../types';
import { seedLog } from '../utils/logger';

function resolveSegment(input: {
  orderCount: number;
  lifetimeValuePoisha: bigint;
  lastOrderAt: Date | null;
}): CustomerSegmentKey {
  const highValueThreshold = BigInt(
    process.env.CRM_HIGH_VALUE_THRESHOLD_POISHA?.trim() || '1000000',
  );
  if (input.orderCount === 0) return CustomerSegmentKey.NEW;
  if (input.lifetimeValuePoisha >= highValueThreshold) {
    return CustomerSegmentKey.HIGH_VALUE;
  }
  if (input.orderCount === 1) return CustomerSegmentKey.ONE_TIME;
  if (input.lastOrderAt) {
    const days =
      (Date.now() - input.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24);
    if (days > 60) return CustomerSegmentKey.DORMANT;
    if (days > 30) return CustomerSegmentKey.AT_RISK;
  }
  return CustomerSegmentKey.ACTIVE;
}

/** Rebuilds CRM projections from seeded orders/wishlists (idempotent upserts). */
export async function seedCrm(ctx: SeedContext): Promise<void> {
  const { prisma, users } = ctx;

  for (const customer of users.customers) {
    const orders = await prisma.customerOrder.findMany({
      where: { userId: customer.id },
      select: {
        id: true,
        status: true,
        totalPoisha: true,
        createdAt: true,
        deliveredAt: true,
        payment: { select: { status: true, amountPoisha: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId: customer.id },
      select: { _count: { select: { items: true } } },
    });

    const returnCount = await prisma.returnRequest.count({
      where: { userId: customer.id },
    });

    const orderCount = orders.length;
    const deliveredOrderCount = orders.filter(
      (o) => o.status === 'DELIVERED' || o.status === 'RETURNED' || o.status === 'EXCHANGED',
    ).length;
    const cancelledOrderCount = orders.filter((o) => o.status === 'CANCELLED').length;

    let lifetimeValuePoisha = 0n;
    for (const order of orders) {
      if (order.payment?.status === PaymentStatus.COLLECTED) {
        lifetimeValuePoisha += order.payment.amountPoisha;
      }
    }

    const averageOrderPoisha =
      deliveredOrderCount > 0 ? lifetimeValuePoisha / BigInt(deliveredOrderCount) : 0n;
    const firstOrderAt = orders[0]?.createdAt ?? null;
    const lastOrderAt = orders[orders.length - 1]?.createdAt ?? null;
    const segmentKey = resolveSegment({
      orderCount,
      lifetimeValuePoisha,
      lastOrderAt,
    });

    await prisma.customerMetric.upsert({
      where: { userId: customer.id },
      create: {
        userId: customer.id,
        orderCount,
        deliveredOrderCount,
        lifetimeValuePoisha,
        averageOrderPoisha,
        lastOrderAt,
        firstOrderAt,
        cancelledOrderCount,
        returnCount,
        wishlistItemCount: wishlist?._count.items ?? 0,
        segmentKey,
      },
      update: {
        orderCount,
        deliveredOrderCount,
        lifetimeValuePoisha,
        averageOrderPoisha,
        lastOrderAt,
        firstOrderAt,
        cancelledOrderCount,
        returnCount,
        wishlistItemCount: wishlist?._count.items ?? 0,
        segmentKey,
      },
    });

    await prisma.customerSegmentMember.upsert({
      where: {
        userId_segmentKey: { userId: customer.id, segmentKey },
      },
      create: {
        userId: customer.id,
        segmentKey,
        source: 'seed:v1',
      },
      update: {
        source: 'seed:v1',
      },
    });

    const activityKey = `seed:activity:signup:${customer.id}`;
    const existingActivity = await prisma.customerActivityEvent.findFirst({
      where: {
        userId: customer.id,
        eventType: 'account.signup',
        title: 'Account created',
      },
      select: { id: true },
    });
    if (!existingActivity) {
      await prisma.customerActivityEvent.create({
        data: {
          userId: customer.id,
          eventType: 'account.signup',
          title: 'Account created',
          href: '/account',
          metadata: { source: activityKey },
          createdAt: new Date('2026-01-15T00:00:00.000Z'),
        },
      });
    }

    for (const order of orders.slice(0, 2)) {
      const meta = { source: `seed:activity:order:${order.id}` };
      const exists = await prisma.customerActivityEvent.findFirst({
        where: {
          userId: customer.id,
          eventType: 'order.placed',
          metadata: { equals: meta },
        },
        select: { id: true },
      });
      if (!exists) {
        await prisma.customerActivityEvent.create({
          data: {
            userId: customer.id,
            eventType: 'order.placed',
            title: 'Order placed',
            href: `/account/orders/${order.id}`,
            metadata: meta,
            createdAt: order.createdAt,
          },
        });
      }
    }
  }

  seedLog(`Seeded CRM metrics for ${users.customers.length} customers.`);
}

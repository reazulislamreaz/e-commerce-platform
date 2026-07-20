import { NotificationType } from '../../../src/generated/prisma/client';
import type { SeedContext } from '../types';
import { seedLog } from '../utils/logger';

export async function seedNotifications(ctx: SeedContext): Promise<void> {
  const { prisma, users } = ctx;
  let created = 0;

  for (const customer of users.customers) {
    const welcomeKey = `seed:welcome:${customer.id}`;
    await prisma.notification.upsert({
      where: {
        userId_dedupeKey: { userId: customer.id, dedupeKey: welcomeKey },
      },
      create: {
        userId: customer.id,
        type: NotificationType.WELCOME,
        title: 'Welcome to Elevate Apparel',
        body: 'Your account is ready. Explore the latest drop and save favorites to your wishlist.',
        href: '/shop',
        dedupeKey: welcomeKey,
      },
      update: {},
    });
    created += 1;

    const orders = await prisma.customerOrder.findMany({
      where: { userId: customer.id },
      select: { id: true, number: true, status: true },
      take: 3,
      orderBy: { createdAt: 'desc' },
    });
    for (const order of orders) {
      const dedupeKey = `seed:order:${order.id}:${order.status}`;
      await prisma.notification.upsert({
        where: {
          userId_dedupeKey: { userId: customer.id, dedupeKey },
        },
        create: {
          userId: customer.id,
          type: NotificationType.ORDER_STATUS,
          title: `Order ${order.number} is ${order.status.toLowerCase()}`,
          body: `We updated your order status to ${order.status}. Track details in your account.`,
          href: `/account/orders/${order.id}`,
          dedupeKey,
          payload: { orderId: order.id, status: order.status },
        },
        update: {},
      });
      created += 1;
    }
  }

  seedLog(`Seeded notifications (${created} upserts).`);
}

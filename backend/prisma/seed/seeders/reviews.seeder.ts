import { ReviewStatus } from '../../../src/generated/prisma/client';
import { seedUuid } from '../utils/ids';
import type { SeedContext } from '../types';
import { seedLog } from '../utils/logger';

/**
 * Attaches verified, user-linked reviews for customers with delivered purchases.
 * Fixture reviews (sourceKey r1–r7) remain from the catalog seeder.
 */
export async function seedUserReviews(ctx: SeedContext): Promise<void> {
  const { prisma, users } = ctx;
  const delivered = await prisma.customerOrder.findMany({
    where: {
      userId: { in: users.customers.map((c) => c.id) },
      OR: [
        { status: 'DELIVERED' },
        { status: 'RETURNED' },
        { status: 'EXCHANGED' },
        { deliveredAt: { not: null } },
      ],
    },
    select: {
      id: true,
      userId: true,
      number: true,
      items: { select: { productId: true }, take: 1 },
    },
    orderBy: { createdAt: 'asc' },
  });

  const reviewCopy: Record<string, { rating: number; title: string; body: string }> = {
    'urban-horizon-distressed-stripe-shirt': {
      rating: 5,
      title: 'Daily driver shirt',
      body: 'Contrast cuffs look premium. Washed once and the stripe still pops.',
    },
    'peach-white-plaid-button-down': {
      rating: 4,
      title: 'Soft and structured',
      body: 'Love the peach plaid. Runs true to size — will order another color.',
    },
    'elevate-blue-essentials-dress-shirt': {
      rating: 5,
      title: 'Office staple',
      body: 'Gingham is clean and the cotton feels substantial. Pairing with the wallet next.',
    },
  };

  let created = 0;
  for (const order of delivered) {
    if (!order.userId || order.items.length === 0) continue;
    const productId = order.items[0]!.productId;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { slug: true },
    });
    if (!product) continue;
    const copy = reviewCopy[product.slug];
    if (!copy) continue;

    const customer = users.customers.find((c) => c.id === order.userId);
    if (!customer) continue;

    const sourceKey = `seed:review:${order.number}`;
    const existingForUser = await prisma.productReview.findFirst({
      where: { userId: customer.id, productId, deletedAt: null },
      select: { id: true },
    });
    if (existingForUser) continue;

    await prisma.productReview.upsert({
      where: { sourceKey },
      create: {
        id: seedUuid(sourceKey),
        sourceKey,
        productId,
        userId: customer.id,
        authorName: `${customer.firstName} ${customer.lastName.charAt(0)}.`,
        rating: copy.rating,
        title: copy.title,
        body: copy.body,
        verified: true,
        status: ReviewStatus.PUBLISHED,
        publishedAt: new Date('2026-06-01T00:00:00.000Z'),
      },
      update: {
        rating: copy.rating,
        title: copy.title,
        body: copy.body,
        verified: true,
        status: ReviewStatus.PUBLISHED,
        deletedAt: null,
      },
    });
    created += 1;
  }

  // One pending review for moderation demos.
  const pendingProduct = await prisma.product.findFirst({
    where: { slug: 'minimal-tee' },
    select: { id: true },
  });
  const reviewer = users.customers[2];
  if (pendingProduct && reviewer) {
    const sourceKey = 'seed:review:pending:minimal-tee';
    const already = await prisma.productReview.findFirst({
      where: { userId: reviewer.id, productId: pendingProduct.id, deletedAt: null },
      select: { id: true },
    });
    if (!already) {
      await prisma.productReview.upsert({
        where: { sourceKey },
        create: {
          id: seedUuid(sourceKey),
          sourceKey,
          productId: pendingProduct.id,
          userId: reviewer.id,
          authorName: `${reviewer.firstName} ${reviewer.lastName.charAt(0)}.`,
          rating: 4,
          title: 'Clean essential',
          body: 'Waiting on a second wash before I fully commit — soft so far.',
          verified: true,
          status: ReviewStatus.PENDING,
        },
        update: {
          status: ReviewStatus.PENDING,
          deletedAt: null,
        },
      });
      created += 1;
    }
  }

  seedLog(`Seeded ${created} user-linked reviews.`);
}

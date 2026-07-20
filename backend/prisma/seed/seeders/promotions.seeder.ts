import {
  PromotionRewardType,
  PromotionStatus,
} from '../../../src/generated/prisma/client';
import type { SeedContext } from '../types';
import { seedLog } from '../utils/logger';

const ELEVATE10_PROMOTION_ID = '00000000-0000-4000-8000-000000000001';
const FREESHIP_PROMOTION_ID = '00000000-0000-4000-8000-000000000002';
const WELCOME20_PROMOTION_ID = '00000000-0000-4000-8000-000000000003';

/**
 * Seeds storefront coupon codes. ELEVATE10 / FREESHIP match CI and UI fixtures.
 */
export async function seedPromotions(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;

  const elevate = await prisma.promotion.upsert({
    where: { id: ELEVATE10_PROMOTION_ID },
    create: {
      id: ELEVATE10_PROMOTION_ID,
      name: '10% off first order',
      status: PromotionStatus.ACTIVE,
      rewardType: PromotionRewardType.PERCENT_OFF,
      percentOff: 10,
      minOrderPoisha: 150_000n,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
    },
    update: {
      name: '10% off first order',
      status: PromotionStatus.ACTIVE,
      rewardType: PromotionRewardType.PERCENT_OFF,
      percentOff: 10,
      fixedOffPoisha: null,
      minOrderPoisha: 150_000n,
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
      deletedAt: null,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'ELEVATE10' },
    create: {
      promotionId: elevate.id,
      code: 'ELEVATE10',
      title: '10% off your first order',
      description: 'Valid on orders over ৳1500. One-time use.',
      maxRedemptionsPerUser: 1,
    },
    update: {
      promotionId: elevate.id,
      title: '10% off your first order',
      description: 'Valid on orders over ৳1500. One-time use.',
      deletedAt: null,
    },
  });

  const freeship = await prisma.promotion.upsert({
    where: { id: FREESHIP_PROMOTION_ID },
    create: {
      id: FREESHIP_PROMOTION_ID,
      name: 'Free shipping',
      status: PromotionStatus.ACTIVE,
      rewardType: PromotionRewardType.FREE_SHIPPING,
      minOrderPoisha: 0n,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-09-30T23:59:59.000Z'),
    },
    update: {
      name: 'Free shipping',
      status: PromotionStatus.ACTIVE,
      rewardType: PromotionRewardType.FREE_SHIPPING,
      percentOff: null,
      fixedOffPoisha: null,
      minOrderPoisha: 0n,
      endsAt: new Date('2026-09-30T23:59:59.000Z'),
      deletedAt: null,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'FREESHIP' },
    create: {
      promotionId: freeship.id,
      code: 'FREESHIP',
      title: 'Free shipping',
      description: 'Waives shipping on any order. One-time use.',
      maxRedemptionsPerUser: 1,
    },
    update: {
      promotionId: freeship.id,
      title: 'Free shipping',
      description: 'Waives shipping on any order. One-time use.',
      deletedAt: null,
    },
  });

  const welcome = await prisma.promotion.upsert({
    where: { id: WELCOME20_PROMOTION_ID },
    create: {
      id: WELCOME20_PROMOTION_ID,
      name: '৳200 off midweek',
      status: PromotionStatus.ACTIVE,
      rewardType: PromotionRewardType.FIXED_OFF,
      fixedOffPoisha: 20_000n,
      minOrderPoisha: 200_000n,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
    },
    update: {
      name: '৳200 off midweek',
      status: PromotionStatus.ACTIVE,
      rewardType: PromotionRewardType.FIXED_OFF,
      percentOff: null,
      fixedOffPoisha: 20_000n,
      minOrderPoisha: 200_000n,
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
      deletedAt: null,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'MIDWEEK200' },
    create: {
      promotionId: welcome.id,
      code: 'MIDWEEK200',
      title: '৳200 off orders over ৳2000',
      description: 'Fixed discount for midweek drops. One-time use per customer.',
      maxRedemptionsPerUser: 1,
      maxRedemptionsGlobal: 500,
    },
    update: {
      promotionId: welcome.id,
      title: '৳200 off orders over ৳2000',
      description: 'Fixed discount for midweek drops. One-time use per customer.',
      deletedAt: null,
    },
  });

  seedLog('Seeded coupons ELEVATE10, FREESHIP, and MIDWEEK200.');
}

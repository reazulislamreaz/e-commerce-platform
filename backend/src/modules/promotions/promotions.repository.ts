import { Injectable } from '@nestjs/common';
import { Prisma, PromotionStatus } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

const couponWithPromotion = {
  promotion: true,
} satisfies Prisma.CouponInclude;

export type CouponWithPromotion = Prisma.CouponGetPayload<{
  include: typeof couponWithPromotion;
}>;

@Injectable()
export class PromotionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCouponByCode(
    code: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<CouponWithPromotion | null> {
    return tx.coupon.findFirst({
      where: { code, deletedAt: null },
      include: couponWithPromotion,
    });
  }

  listActiveCoupons(now = new Date()): Promise<CouponWithPromotion[]> {
    return this.prisma.coupon.findMany({
      where: {
        deletedAt: null,
        promotion: {
          deletedAt: null,
          status: PromotionStatus.ACTIVE,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
      },
      include: couponWithPromotion,
      orderBy: [{ code: 'asc' }],
    });
  }

  countUserRedemptions(
    couponId: string,
    userId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<number> {
    return tx.couponRedemption.count({
      where: { couponId, userId },
    });
  }

  countGlobalRedemptions(
    couponId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<number> {
    return tx.couponRedemption.count({
      where: { couponId },
    });
  }

  createRedemption(
    data: {
      couponId: string;
      userId: string | null;
      orderId: string;
      discountPoisha: bigint;
      shippingWaived: boolean;
    },
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    return tx.couponRedemption
      .create({
        data: {
          couponId: data.couponId,
          userId: data.userId,
          orderId: data.orderId,
          discountPoisha: data.discountPoisha,
          shippingWaived: data.shippingWaived,
        },
      })
      .then(() => undefined);
  }
}

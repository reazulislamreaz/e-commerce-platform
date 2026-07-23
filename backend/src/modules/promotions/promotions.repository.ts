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

  /** Row-lock a coupon for concurrent redemption safety. */
  async lockCouponById(couponId: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`
      SELECT id FROM coupon WHERE id = ${couponId}::uuid FOR UPDATE
    `;
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

  voidRedemptionForOrder(
    orderId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    return tx.couponRedemption.deleteMany({ where: { orderId } }).then(() => undefined);
  }

  async listAdminCoupons(params: {
    skip: number;
    take: number;
  }): Promise<{ rows: CouponWithPromotion[]; total: number }> {
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.coupon.count({ where: { deletedAt: null } }),
      this.prisma.coupon.findMany({
        where: { deletedAt: null },
        include: couponWithPromotion,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: params.skip,
        take: params.take,
      }),
    ]);
    return { rows, total };
  }

  findAdminCouponById(id: string): Promise<CouponWithPromotion | null> {
    return this.prisma.coupon.findFirst({
      where: { id, deletedAt: null },
      include: couponWithPromotion,
    });
  }

  createAdminCoupon(
    data: {
      code: string;
      title: string;
      description: string;
      rewardType: Prisma.PromotionCreateInput['rewardType'];
      percentOff: number | null;
      fixedOffPoisha: bigint | null;
      minOrderPoisha: bigint;
      startsAt: Date;
      endsAt: Date | null;
      maxRedemptionsPerUser: number;
    },
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<CouponWithPromotion> {
    return tx.coupon.create({
      data: {
        code: data.code,
        title: data.title,
        description: data.description,
        maxRedemptionsPerUser: data.maxRedemptionsPerUser,
        promotion: {
          create: {
            name: data.title,
            rewardType: data.rewardType,
            percentOff: data.percentOff,
            fixedOffPoisha: data.fixedOffPoisha,
            minOrderPoisha: data.minOrderPoisha,
            startsAt: data.startsAt,
            endsAt: data.endsAt,
          },
        },
      },
      include: couponWithPromotion,
    });
  }

  updateAdminCoupon(
    id: string,
    couponData: Prisma.CouponUpdateInput,
    promotionData: Prisma.PromotionUpdateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<CouponWithPromotion> {
    return tx.coupon.update({
      where: { id },
      data: {
        ...couponData,
        promotion: { update: promotionData },
      },
      include: couponWithPromotion,
    });
  }

  deactivateCouponPromotion(
    promotionId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    return tx.promotion
      .update({
        where: { id: promotionId },
        data: { status: PromotionStatus.DISABLED },
      })
      .then(() => undefined);
  }

  async listCouponRedemptions(couponId: string, params: { skip: number; take: number }) {
    const [total, items] = await this.prisma.$transaction([
      this.prisma.couponRedemption.count({ where: { couponId } }),
      this.prisma.couponRedemption.findMany({
        where: { couponId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: params.skip,
        take: params.take,
      }),
    ]);
    return { items, total };
  }
}

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  PromotionRewardType,
  PromotionStatus,
} from '@/generated/prisma/client';
import { poishaToTaka, takaToPoisha } from '@/common/utils/money';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { AuditService } from '@/modules/platform/audit.service';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  CreateAdminCouponDto,
  ListAdminCouponRedemptionsQueryDto,
  UpdateAdminCouponDto,
} from './dto/admin-coupon.dto';
import type { CouponResponseDto } from './dto/coupon-response.dto';
import type { ValidateCouponDto } from './dto/validate-coupon.dto';
import type { ValidateCouponResponseDto } from './dto/validate-coupon-response.dto';
import {
  PromotionsRepository,
  type CouponWithPromotion,
} from './promotions.repository';

export type CouponQuote = {
  couponId: string;
  code: string;
  discountPoisha: bigint;
  shippingWaived: boolean;
  title: string;
};

export type RedeemCouponInput = {
  couponId: string;
  userId: string | null;
  orderId: string;
  discountPoisha: bigint;
  shippingWaived: boolean;
};

const INVALID_COUPON_MESSAGE = 'Invalid or expired coupon code.';

@Injectable()
export class PromotionsService {
  constructor(
    private readonly promotions: PromotionsRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  async validate(
    dto: ValidateCouponDto,
    userId: string,
  ): Promise<ValidateCouponResponseDto> {
    const quote = await this.quoteCoupon(
      dto.code,
      takaToPoisha(dto.subtotal),
      userId,
    );

    return {
      code: quote.code,
      discount: poishaToTaka(quote.discountPoisha),
      shippingWaived: quote.shippingWaived,
      title: quote.title,
    };
  }

  async listMine(userId: string): Promise<CouponResponseDto[]> {
    const coupons = await this.promotions.listActiveCoupons();
    const results = await Promise.all(
      coupons.map(async (coupon) => {
        const userRedemptions = await this.promotions.countUserRedemptions(
          coupon.id,
          userId,
        );
        return this.toCouponResponse(
          coupon,
          userRedemptions >= coupon.maxRedemptionsPerUser,
        );
      }),
    );
    return results;
  }

  async quoteCoupon(
    code: string,
    subtotalPoisha: bigint,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CouponQuote> {
    const normalizedCode = this.normalizeCode(code);
    const coupon = await this.promotions.findCouponByCode(normalizedCode, tx);
    if (!coupon) {
      throw new BadRequestException(INVALID_COUPON_MESSAGE);
    }

    await this.assertCouponEligible(coupon, subtotalPoisha, userId, tx);

    const { discountPoisha, shippingWaived } = this.computeReward(
      coupon,
      subtotalPoisha,
    );

    return {
      couponId: coupon.id,
      code: coupon.code,
      discountPoisha,
      shippingWaived,
      title: coupon.title,
    };
  }

  async redeemCoupon(
    input: RedeemCouponInput,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.promotions.lockCouponById(input.couponId, tx);
    await this.promotions.createRedemption(input, tx);
  }

  async voidRedemptionForOrder(
    orderId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.promotions.voidRedemptionForOrder(orderId, tx);
  }

  /**
   * Lock the coupon row, re-validate eligibility, and return a fresh quote inside a transaction.
   */
  async quoteCouponLocked(
    code: string,
    subtotalPoisha: bigint,
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<CouponQuote> {
    const normalizedCode = this.normalizeCode(code);
    const coupon = await this.promotions.findCouponByCode(normalizedCode, tx);
    if (!coupon) {
      throw new BadRequestException(INVALID_COUPON_MESSAGE);
    }
    await this.promotions.lockCouponById(coupon.id, tx);
    const locked = await this.promotions.findCouponByCode(normalizedCode, tx);
    if (!locked) {
      throw new BadRequestException(INVALID_COUPON_MESSAGE);
    }
    await this.assertCouponEligible(locked, subtotalPoisha, userId, tx);
    const { discountPoisha, shippingWaived } = this.computeReward(locked, subtotalPoisha);
    return {
      couponId: locked.id,
      code: locked.code,
      discountPoisha,
      shippingWaived,
      title: locked.title,
    };
  }

  async listAdminCoupons() {
    const coupons = await this.promotions.listAdminCoupons();
    return coupons.map((coupon) => this.toAdminCouponResponse(coupon));
  }

  async getAdminCoupon(id: string) {
    const coupon = await this.promotions.findAdminCouponById(id);
    if (!coupon) throw new NotFoundException('Coupon not found');
    return this.toAdminCouponResponse(coupon);
  }

  async createAdminCoupon(actor: JwtPayload, dto: CreateAdminCouponDto) {
    const reward = this.mapRewardInput(dto.rewardType, dto.value);
    const code = this.normalizeCode(dto.code);

    try {
      const coupon = await this.prisma.$transaction(async (tx) => {
        const created = await this.promotions.createAdminCoupon(
          {
            code,
            title: dto.title,
            description: dto.description,
            rewardType: reward.rewardType,
            percentOff: reward.percentOff,
            fixedOffPoisha: reward.fixedOffPoisha,
            minOrderPoisha: takaToPoisha(dto.minOrderTaka),
            startsAt: new Date(dto.startsAt),
            endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
            maxRedemptionsPerUser: dto.maxRedemptionsPerUser ?? 1,
          },
          tx,
        );
        await this.audit.write(
          {
            actorUserId: actor.sub,
            actorRole: actor.role,
            action: 'coupon.create',
            resourceType: 'coupon',
            resourceId: created.id,
            after: { code: created.code, rewardType: dto.rewardType },
          },
          tx,
        );
        return created;
      });
      return this.toAdminCouponResponse(coupon);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Coupon code already exists');
      }
      throw error;
    }
  }

  async updateAdminCoupon(actor: JwtPayload, id: string, dto: UpdateAdminCouponDto) {
    const existing = await this.promotions.findAdminCouponById(id);
    if (!existing) throw new NotFoundException('Coupon not found');

    const reward = dto.rewardType
      ? this.mapRewardInput(dto.rewardType, dto.value)
      : null;

    const coupon = await this.prisma.$transaction(async (tx) => {
      const updated = await this.promotions.updateAdminCoupon(
        id,
        {
          ...(dto.title != null ? { title: dto.title } : {}),
          ...(dto.description != null ? { description: dto.description } : {}),
          ...(dto.maxRedemptionsPerUser != null
            ? { maxRedemptionsPerUser: dto.maxRedemptionsPerUser }
            : {}),
        },
        {
          ...(dto.title != null ? { name: dto.title } : {}),
          ...(dto.minOrderTaka != null
            ? { minOrderPoisha: takaToPoisha(dto.minOrderTaka) }
            : {}),
          ...(dto.startsAt != null ? { startsAt: new Date(dto.startsAt) } : {}),
          ...(dto.endsAt !== undefined
            ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null }
            : {}),
          ...(reward
            ? {
                rewardType: reward.rewardType,
                percentOff: reward.percentOff,
                fixedOffPoisha: reward.fixedOffPoisha,
              }
            : {}),
        },
        tx,
      );
      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: 'coupon.update',
          resourceType: 'coupon',
          resourceId: id,
          before: { code: existing.code, title: existing.title },
          after: { code: updated.code, title: updated.title },
        },
        tx,
      );
      return updated;
    });

    return this.toAdminCouponResponse(coupon);
  }

  async deactivateAdminCoupon(actor: JwtPayload, id: string) {
    const existing = await this.promotions.findAdminCouponById(id);
    if (!existing) throw new NotFoundException('Coupon not found');

    await this.prisma.$transaction(async (tx) => {
      await this.promotions.deactivateCouponPromotion(existing.promotionId, tx);
      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: 'coupon.deactivate',
          resourceType: 'coupon',
          resourceId: id,
          before: { status: existing.promotion.status },
          after: { status: PromotionStatus.DISABLED },
        },
        tx,
      );
    });

    return this.getAdminCoupon(id);
  }

  async listAdminCouponRedemptions(id: string, query: ListAdminCouponRedemptionsQueryDto) {
    const existing = await this.promotions.findAdminCouponById(id);
    if (!existing) throw new NotFoundException('Coupon not found');

    const { items, hasMore } = await this.promotions.listCouponRedemptions(
      id,
      query.cursor,
      query.limit,
    );

    return {
      data: items.map((redemption) => ({
        id: redemption.id,
        orderId: redemption.orderId,
        userId: redemption.userId,
        discountTaka: poishaToTaka(redemption.discountPoisha),
        shippingWaived: redemption.shippingWaived,
        createdAt: redemption.createdAt.toISOString(),
      })),
      meta: {
        limit: query.limit,
        nextCursor: hasMore ? items[items.length - 1].id : null,
      },
    };
  }

  private async assertCouponEligible(
    coupon: CouponWithPromotion,
    subtotalPoisha: bigint,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const now = new Date();
    const { promotion } = coupon;

    if (
      coupon.deletedAt ||
      promotion.deletedAt ||
      promotion.status !== PromotionStatus.ACTIVE
    ) {
      throw new BadRequestException(INVALID_COUPON_MESSAGE);
    }

    if (promotion.startsAt > now) {
      throw new BadRequestException(INVALID_COUPON_MESSAGE);
    }

    if (promotion.endsAt && promotion.endsAt < now) {
      throw new BadRequestException(INVALID_COUPON_MESSAGE);
    }

    if (subtotalPoisha < promotion.minOrderPoisha) {
      throw new BadRequestException(
        `Minimum order of ৳${poishaToTaka(promotion.minOrderPoisha)} required for this coupon.`,
      );
    }

    const userRedemptions = await this.promotions.countUserRedemptions(
      coupon.id,
      userId,
      tx,
    );
    if (userRedemptions >= coupon.maxRedemptionsPerUser) {
      throw new BadRequestException(INVALID_COUPON_MESSAGE);
    }

    if (coupon.maxRedemptionsGlobal != null) {
      const globalRedemptions = await this.promotions.countGlobalRedemptions(
        coupon.id,
        tx,
      );
      if (globalRedemptions >= coupon.maxRedemptionsGlobal) {
        throw new BadRequestException(INVALID_COUPON_MESSAGE);
      }
    }
  }

  private computeReward(
    coupon: CouponWithPromotion,
    subtotalPoisha: bigint,
  ): { discountPoisha: bigint; shippingWaived: boolean } {
    switch (coupon.promotion.rewardType) {
      case PromotionRewardType.FREE_SHIPPING:
        return { discountPoisha: 0n, shippingWaived: true };
      case PromotionRewardType.PERCENT_OFF: {
        const percentOff = coupon.promotion.percentOff;
        if (percentOff == null) {
          throw new BadRequestException(INVALID_COUPON_MESSAGE);
        }
        const subtotalTaka = poishaToTaka(subtotalPoisha);
        const discountTaka = Math.round((subtotalTaka * percentOff) / 100);
        return {
          discountPoisha: takaToPoisha(discountTaka),
          shippingWaived: false,
        };
      }
      case PromotionRewardType.FIXED_OFF: {
        const fixedOffPoisha = coupon.promotion.fixedOffPoisha;
        if (fixedOffPoisha == null) {
          throw new BadRequestException(INVALID_COUPON_MESSAGE);
        }
        return {
          discountPoisha:
            fixedOffPoisha < subtotalPoisha ? fixedOffPoisha : subtotalPoisha,
          shippingWaived: false,
        };
      }
      default:
        throw new BadRequestException(INVALID_COUPON_MESSAGE);
    }
  }

  private toCouponResponse(
    coupon: CouponWithPromotion,
    used: boolean,
  ): CouponResponseDto {
    const { promotion } = coupon;
    const discountType = this.mapDiscountType(promotion.rewardType);
    const value = this.mapDiscountValue(promotion);

    return {
      id: coupon.id,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      discountType,
      value,
      minOrder: poishaToTaka(promotion.minOrderPoisha),
      expiresAt:
        promotion.endsAt?.toISOString() ??
        '2099-12-31T23:59:59.000Z',
      used,
    };
  }

  private mapDiscountType(
    rewardType: PromotionRewardType,
  ): CouponResponseDto['discountType'] {
    switch (rewardType) {
      case PromotionRewardType.PERCENT_OFF:
        return 'percent';
      case PromotionRewardType.FIXED_OFF:
        return 'fixed';
      case PromotionRewardType.FREE_SHIPPING:
        return 'free_shipping';
      default:
        return 'fixed';
    }
  }

  private mapDiscountValue(promotion: CouponWithPromotion['promotion']): number {
    switch (promotion.rewardType) {
      case PromotionRewardType.PERCENT_OFF:
        return promotion.percentOff ?? 0;
      case PromotionRewardType.FIXED_OFF:
        return promotion.fixedOffPoisha != null
          ? poishaToTaka(promotion.fixedOffPoisha)
          : 0;
      case PromotionRewardType.FREE_SHIPPING:
        return 0;
      default:
        return 0;
    }
  }

  private toAdminCouponResponse(coupon: CouponWithPromotion) {
    const { promotion } = coupon;
    return {
      id: coupon.id,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      rewardType: this.mapDiscountType(promotion.rewardType),
      value: this.mapDiscountValue(promotion),
      minOrderTaka: poishaToTaka(promotion.minOrderPoisha),
      status: promotion.status,
      startsAt: promotion.startsAt.toISOString(),
      endsAt: promotion.endsAt?.toISOString() ?? null,
      maxRedemptionsPerUser: coupon.maxRedemptionsPerUser,
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
    };
  }

  private mapRewardInput(
    rewardType: 'percent' | 'fixed' | 'free_shipping',
    value?: number,
  ): {
    rewardType: PromotionRewardType;
    percentOff: number | null;
    fixedOffPoisha: bigint | null;
  } {
    switch (rewardType) {
      case 'percent':
        if (value == null || value <= 0 || value > 100) {
          throw new BadRequestException('Percent coupons require value between 1 and 100');
        }
        return {
          rewardType: PromotionRewardType.PERCENT_OFF,
          percentOff: Math.round(value),
          fixedOffPoisha: null,
        };
      case 'fixed':
        if (value == null || value <= 0) {
          throw new BadRequestException('Fixed coupons require a positive value in taka');
        }
        return {
          rewardType: PromotionRewardType.FIXED_OFF,
          percentOff: null,
          fixedOffPoisha: takaToPoisha(value),
        };
      case 'free_shipping':
        return {
          rewardType: PromotionRewardType.FREE_SHIPPING,
          percentOff: null,
          fixedOffPoisha: null,
        };
      default:
        throw new BadRequestException('Unsupported reward type');
    }
  }
}

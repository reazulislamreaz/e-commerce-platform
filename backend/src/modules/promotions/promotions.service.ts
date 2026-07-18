import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Prisma,
  PromotionRewardType,
  PromotionStatus,
} from '@/generated/prisma/client';
import { poishaToTaka, takaToPoisha } from '@/common/utils/money';
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
  constructor(private readonly promotions: PromotionsRepository) {}

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
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await this.promotions.createRedemption(input, tx);
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
}

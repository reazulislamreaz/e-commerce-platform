import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  PromotionRewardType,
  PromotionStatus,
} from '@/generated/prisma/client';
import { takaToPoisha } from '@/common/utils/money';
import { AuditService } from '@/modules/platform/audit.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  PromotionsRepository,
  type CouponWithPromotion,
} from './promotions.repository';
import { PromotionsService } from './promotions.service';

const userId = '11111111-1111-4111-8111-111111111111';

function buildCoupon(overrides: {
  coupon?: Partial<CouponWithPromotion>;
  promotion?: Partial<CouponWithPromotion['promotion']>;
} = {}): CouponWithPromotion {
  const promotion: CouponWithPromotion['promotion'] = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Test promotion',
    status: PromotionStatus.ACTIVE,
    rewardType: PromotionRewardType.PERCENT_OFF,
    percentOff: 10,
    fixedOffPoisha: null,
    minOrderPoisha: 150_000n,
    startsAt: new Date('2026-01-01T00:00:00.000Z'),
    endsAt: new Date('2026-12-31T23:59:59.000Z'),
    stackable: false,
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides.promotion,
  };

  return {
    id: '33333333-3333-4333-8333-333333333333',
    promotionId: promotion.id,
    code: 'ELEVATE10',
    title: '10% off your first order',
    description: 'Valid on orders over ৳1500. One-time use.',
    maxRedemptionsGlobal: null,
    maxRedemptionsPerUser: 1,
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    promotion,
    ...overrides.coupon,
  };
}

describe('PromotionsService', () => {
  let service: PromotionsService;
  const repository = {
    findCouponByCode: jest.fn(),
    listActiveCoupons: jest.fn(),
    countUserRedemptions: jest.fn(),
    countGlobalRedemptions: jest.fn(),
    createRedemption: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: PromotionsRepository, useValue: repository },
        { provide: PrismaService, useValue: { $transaction: jest.fn() } },
        { provide: AuditService, useValue: { write: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(PromotionsService);
    jest.clearAllMocks();
    repository.countUserRedemptions.mockResolvedValue(0);
    repository.countGlobalRedemptions.mockResolvedValue(0);
  });

  it('quotes FREESHIP with zero item discount and waived shipping', async () => {
    repository.findCouponByCode.mockResolvedValue(
      buildCoupon({
        coupon: {
          code: 'FREESHIP',
          title: 'Free shipping',
        },
        promotion: {
          rewardType: PromotionRewardType.FREE_SHIPPING,
          percentOff: null,
          fixedOffPoisha: null,
          minOrderPoisha: 0n,
          endsAt: new Date('2026-09-30T23:59:59.000Z'),
        },
      }),
    );

    const quote = await service.quoteCoupon(
      'freeship',
      takaToPoisha(500),
      userId,
    );

    expect(quote).toEqual({
      couponId: '33333333-3333-4333-8333-333333333333',
      code: 'FREESHIP',
      discountPoisha: 0n,
      shippingWaived: true,
      title: 'Free shipping',
    });
  });

  it('quotes ELEVATE10 as 10% of the subtotal in taka', async () => {
    repository.findCouponByCode.mockResolvedValue(buildCoupon());

    const quote = await service.quoteCoupon(
      'elevate10',
      takaToPoisha(2000),
      userId,
    );

    expect(quote.discountPoisha).toBe(200_00n);
    expect(quote.shippingWaived).toBe(false);
    expect(quote.code).toBe('ELEVATE10');
  });

  it('rejects coupons below the minimum order', async () => {
    repository.findCouponByCode.mockResolvedValue(buildCoupon());

    await expect(
      service.quoteCoupon('ELEVATE10', takaToPoisha(1000), userId),
    ).rejects.toThrow(
      new BadRequestException(
        'Minimum order of ৳1500 required for this coupon.',
      ),
    );
  });

  it('rejects expired coupons', async () => {
    repository.findCouponByCode.mockResolvedValue(
      buildCoupon({
        promotion: {
          endsAt: new Date('2020-01-01T00:00:00.000Z'),
        },
      }),
    );

    await expect(
      service.quoteCoupon('ELEVATE10', takaToPoisha(2000), userId),
    ).rejects.toThrow(new BadRequestException('Invalid or expired coupon code.'));
  });

  it('rejects coupons already used by the user', async () => {
    repository.findCouponByCode.mockResolvedValue(buildCoupon());
    repository.countUserRedemptions.mockResolvedValue(1);

    await expect(
      service.quoteCoupon('ELEVATE10', takaToPoisha(2000), userId),
    ).rejects.toThrow(new BadRequestException('Invalid or expired coupon code.'));
  });
});

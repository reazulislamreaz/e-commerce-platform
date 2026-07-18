import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderStatus } from '@/generated/prisma/client';
import { STANDARD_SHIPPING_POISHA, takaToPoisha } from '@/common/utils/money';
import { CartService } from '@/modules/cart/cart.service';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { AuditService } from '@/modules/platform/audit.service';
import { IdempotencyService } from '@/modules/platform/idempotency.service';
import { OutboxService } from '@/modules/platform/outbox.service';
import { PromotionsService } from '@/modules/promotions/promotions.service';
import { PrismaService } from '@/prisma/prisma.service';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: { $transaction: jest.fn() } },
        { provide: OrdersRepository, useValue: {} },
        { provide: CartService, useValue: {} },
        { provide: InventoryService, useValue: {} },
        { provide: PromotionsService, useValue: {} },
        { provide: IdempotencyService, useValue: {} },
        { provide: OutboxService, useValue: {} },
        { provide: AuditService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  describe('computeCheckoutTotals', () => {
    it('applies standard shipping when subtotal is positive', () => {
      const totals = service.computeCheckoutTotals({
        subtotalPoisha: takaToPoisha(1500),
        discountPoisha: 0n,
        shippingWaived: false,
      });

      expect(totals).toEqual({
        subtotalPoisha: takaToPoisha(1500),
        discountPoisha: 0n,
        shippingPoisha: STANDARD_SHIPPING_POISHA,
        totalPoisha: takaToPoisha(1500) + STANDARD_SHIPPING_POISHA,
        shippingWaived: false,
      });
    });

    it('waives shipping for FREESHIP-style coupons with zero discount', () => {
      const totals = service.computeCheckoutTotals({
        subtotalPoisha: takaToPoisha(500),
        discountPoisha: 0n,
        shippingWaived: true,
      });

      expect(totals).toEqual({
        subtotalPoisha: takaToPoisha(500),
        discountPoisha: 0n,
        shippingPoisha: 0n,
        totalPoisha: takaToPoisha(500),
        shippingWaived: true,
      });
    });

    it('returns zero shipping when subtotal is zero', () => {
      const totals = service.computeCheckoutTotals({
        subtotalPoisha: 0n,
        discountPoisha: 0n,
        shippingWaived: false,
      });

      expect(totals.shippingPoisha).toBe(0n);
      expect(totals.totalPoisha).toBe(0n);
    });

    it('subtracts item discounts before adding shipping', () => {
      const totals = service.computeCheckoutTotals({
        subtotalPoisha: takaToPoisha(2000),
        discountPoisha: takaToPoisha(200),
        shippingWaived: false,
      });

      expect(totals.totalPoisha).toBe(
        takaToPoisha(2000) - takaToPoisha(200) + STANDARD_SHIPPING_POISHA,
      );
    });
  });

  describe('assertFulfillmentTransition', () => {
    it('allows CONFIRMED to PROCESSING', () => {
      expect(() =>
        service.assertFulfillmentTransition(OrderStatus.CONFIRMED, OrderStatus.PROCESSING),
      ).not.toThrow();
    });

    it('allows PROCESSING to SHIPPED', () => {
      expect(() =>
        service.assertFulfillmentTransition(OrderStatus.PROCESSING, OrderStatus.SHIPPED),
      ).not.toThrow();
    });

    it('allows SHIPPED to DELIVERED', () => {
      expect(() =>
        service.assertFulfillmentTransition(OrderStatus.SHIPPED, OrderStatus.DELIVERED),
      ).not.toThrow();
    });

    it('rejects skipping from CONFIRMED to SHIPPED', () => {
      expect(() =>
        service.assertFulfillmentTransition(OrderStatus.CONFIRMED, OrderStatus.SHIPPED),
      ).toThrow(BadRequestException);
    });

    it('rejects transitions from terminal DELIVERED', () => {
      expect(() =>
        service.assertFulfillmentTransition(OrderStatus.DELIVERED, OrderStatus.CANCELLED),
      ).toThrow(BadRequestException);
    });

    it('rejects transitions from terminal CANCELLED', () => {
      expect(() =>
        service.assertFulfillmentTransition(OrderStatus.CANCELLED, OrderStatus.PROCESSING),
      ).toThrow(BadRequestException);
    });
  });
});

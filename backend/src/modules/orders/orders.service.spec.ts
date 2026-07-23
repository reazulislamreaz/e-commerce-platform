import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderStatus, PaymentStatus, ReservationStatus } from '@/generated/prisma/client';
import { STANDARD_SHIPPING_POISHA, takaToPoisha } from '@/common/utils/money';
import { CartService } from '@/modules/cart/cart.service';
import { CustomerMetricsService } from '@/modules/crm/customer-metrics.service';
import { DeliveryPartnersService } from '@/modules/delivery-partners/delivery-partners.service';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { AuditService } from '@/modules/platform/audit.service';
import { IdempotencyService } from '@/modules/platform/idempotency.service';
import { OutboxService } from '@/modules/platform/outbox.service';
import { PromotionsService } from '@/modules/promotions/promotions.service';
import { PrismaService } from '@/prisma/prisma.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: {
    inventoryReservation: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let inventory: { releaseForOrder: jest.Mock };
  let promotions: { voidRedemptionForOrder: jest.Mock };

  beforeEach(async () => {
    prisma = {
      inventoryReservation: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    inventory = { releaseForOrder: jest.fn() };
    promotions = { voidRedemptionForOrder: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrdersRepository, useValue: {} },
        { provide: CartService, useValue: {} },
        { provide: InventoryService, useValue: inventory },
        { provide: PromotionsService, useValue: promotions },
        { provide: IdempotencyService, useValue: {} },
        { provide: OutboxService, useValue: {} },
        { provide: AuditService, useValue: {} },
        { provide: NotificationsService, useValue: { createForUser: jest.fn() } },
        {
          provide: CustomerMetricsService,
          useValue: { recordActivity: jest.fn(), recomputeForUser: jest.fn() },
        },
        {
          provide: DeliveryPartnersService,
          useValue: { resolveTrackingUrl: jest.fn() },
        },
        { provide: InvoicePdfService, useValue: { generate: jest.fn() } },
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

    it('allows PROCESSING to PACKED', () => {
      expect(() =>
        service.assertFulfillmentTransition(OrderStatus.PROCESSING, OrderStatus.PACKED),
      ).not.toThrow();
    });

    it('allows PACKED to SHIPPED', () => {
      expect(() =>
        service.assertFulfillmentTransition(OrderStatus.PACKED, OrderStatus.SHIPPED),
      ).not.toThrow();
    });

    it('allows SHIPPED to DELIVERED', () => {
      expect(() =>
        service.assertFulfillmentTransition(OrderStatus.SHIPPED, OrderStatus.DELIVERED),
      ).not.toThrow();
    });

    it('allows pre-ship cancel branches', () => {
      expect(() =>
        service.assertFulfillmentTransition(OrderStatus.CONFIRMED, OrderStatus.CANCELLED),
      ).not.toThrow();
      expect(() =>
        service.assertFulfillmentTransition(OrderStatus.PROCESSING, OrderStatus.CANCELLED),
      ).not.toThrow();
      expect(() =>
        service.assertFulfillmentTransition(OrderStatus.PACKED, OrderStatus.CANCELLED),
      ).not.toThrow();
    });

    it('rejects skipping from PROCESSING to SHIPPED', () => {
      expect(() =>
        service.assertFulfillmentTransition(OrderStatus.PROCESSING, OrderStatus.SHIPPED),
      ).toThrow(BadRequestException);
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

  describe('releaseExpiredReservationHolds', () => {
    it('releases inventory and cancels pre-ship orders atomically', async () => {
      const orderId = '44444444-4444-4444-8444-444444444444';
      const expiredAt = new Date(Date.now() - 60_000);
      prisma.inventoryReservation.findMany.mockResolvedValue([{ orderId }]);

      const tx = {
        inventoryReservation: {
          findUnique: jest.fn().mockResolvedValue({
            orderId,
            status: ReservationStatus.ACTIVE,
            expiresAt: expiredAt,
          }),
        },
        customerOrder: {
          findUnique: jest.fn().mockResolvedValue({
            id: orderId,
            status: OrderStatus.CONFIRMED,
            couponCode: 'SAVE10',
            payment: { id: 'pay-1' },
          }),
          update: jest.fn(),
        },
        orderStatusHistory: { create: jest.fn() },
        payment: { update: jest.fn() },
      };

      prisma.$transaction.mockImplementation(async (fn: (inner: typeof tx) => Promise<boolean>) =>
        fn(tx),
      );

      await expect(service.releaseExpiredReservationHolds(10)).resolves.toBe(1);

      expect(inventory.releaseForOrder).toHaveBeenCalledWith(orderId, tx);
      expect(tx.customerOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: orderId },
          data: expect.objectContaining({ status: OrderStatus.CANCELLED }),
        }),
      );
      expect(tx.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: { status: PaymentStatus.CANCELLED },
      });
      expect(promotions.voidRedemptionForOrder).toHaveBeenCalledWith(orderId, tx);
    });
  });
});

import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderStatus, ReturnStatus, ReturnType } from '@/generated/prisma/client';
import { CustomerMetricsService } from '@/modules/crm/customer-metrics.service';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { AuditService } from '@/modules/platform/audit.service';
import { ReturnsRepository } from './returns.repository';
import { ReturnsService } from './returns.service';

const userId = '11111111-1111-4111-8111-111111111111';
const orderId = '33333333-3333-4333-8333-333333333333';

describe('ReturnsService', () => {
  let service: ReturnsService;
  const repository = {
    runTransaction: jest.fn(),
    findOrderForReturn: jest.fn(),
    findActiveByOrderId: jest.fn(),
    findProductsOnSale: jest.fn(),
    sumReturnQuantitiesByOrderItem: jest.fn(),
    findActiveVariantsByIds: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.runTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    );
    repository.sumReturnQuantitiesByOrderItem.mockResolvedValue(new Map());
    repository.findActiveVariantsByIds.mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReturnsService,
        { provide: ReturnsRepository, useValue: repository },
        {
          provide: InventoryService,
          useValue: {
            restockReturn: jest.fn(),
            reserveExchangeReplacements: jest.fn(),
            consumeExchangeReplacements: jest.fn(),
          },
        },
        { provide: AuditService, useValue: { write: jest.fn() } },
        { provide: NotificationsService, useValue: { createForUser: jest.fn() } },
        {
          provide: CustomerMetricsService,
          useValue: { recordActivity: jest.fn(), recomputeForUser: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(ReturnsService);
  });

  it('rejects returns when the order is not delivered', async () => {
    repository.findOrderForReturn.mockResolvedValue({
      id: orderId,
      status: OrderStatus.SHIPPED,
      deliveredAt: null,
      items: [],
    });
    repository.findActiveByOrderId.mockResolvedValue(null);

    await expect(
      service.create(userId, {
        orderId,
        type: 'return',
        reason: 'Too small',
        conditionAttested: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires condition attestation', async () => {
    repository.findOrderForReturn.mockResolvedValue({
      id: orderId,
      status: OrderStatus.DELIVERED,
      deliveredAt: new Date(),
      items: [{ id: 'item-1', variantId: 'var-1', productId: 'prod-1', quantity: 1 }],
    });
    repository.findActiveByOrderId.mockResolvedValue(null);

    await expect(
      service.create(userId, {
        orderId,
        type: 'return',
        reason: 'Changed mind',
        conditionAttested: false,
      }),
    ).rejects.toThrow('You must attest that items are unworn with tags attached');
  });

  it('rejects refund returns that include sale items', async () => {
    repository.findOrderForReturn.mockResolvedValue({
      id: orderId,
      status: OrderStatus.DELIVERED,
      deliveredAt: new Date(),
      items: [{ id: 'item-1', variantId: 'var-1', productId: 'prod-1', quantity: 1 }],
    });
    repository.findActiveByOrderId.mockResolvedValue(null);
    repository.findProductsOnSale.mockResolvedValue([{ id: 'prod-1', onSale: true }]);

    await expect(
      service.create(userId, {
        orderId,
        type: 'return',
        reason: 'Changed mind',
        conditionAttested: true,
      }),
    ).rejects.toThrow('Sale items are exchange only');
  });

  it('rejects quantities above remaining returnable amount', async () => {
    repository.findOrderForReturn.mockResolvedValue({
      id: orderId,
      status: OrderStatus.DELIVERED,
      deliveredAt: new Date(),
      items: [{ id: 'item-1', variantId: 'var-1', productId: 'prod-1', quantity: 1 }],
    });
    repository.findActiveByOrderId.mockResolvedValue(null);
    repository.findProductsOnSale.mockResolvedValue([{ id: 'prod-1', onSale: false }]);
    repository.sumReturnQuantitiesByOrderItem.mockResolvedValue(new Map([['item-1', 1]]));

    await expect(
      service.create(userId, {
        orderId,
        type: 'return',
        reason: 'Changed mind',
        conditionAttested: true,
        items: [{ orderItemId: 'item-1', quantity: 1 }],
      }),
    ).rejects.toThrow('Return quantity exceeds remaining returnable quantity');
  });

  it('allows exchanges for sale items with replacement variants', async () => {
    const deliveredAt = new Date();
    repository.findOrderForReturn.mockResolvedValue({
      id: orderId,
      status: OrderStatus.DELIVERED,
      deliveredAt,
      items: [{ id: 'item-1', variantId: 'var-1', productId: 'prod-1', quantity: 1 }],
    });
    repository.findActiveByOrderId.mockResolvedValue(null);
    repository.findProductsOnSale.mockResolvedValue([{ id: 'prod-1', onSale: true }]);
    repository.findActiveVariantsByIds.mockResolvedValue([
      { id: 'var-2', productId: 'prod-1', size: 'L', color: 'Black' },
    ]);
    repository.create.mockResolvedValue({
      id: 'ret-1',
      orderId,
      userId,
      type: ReturnType.EXCHANGE,
      status: ReturnStatus.PENDING,
      reason: 'Wrong size',
      createdAt: new Date(),
      order: { number: 'EA123456' },
      items: [{ orderItemId: 'item-1', quantity: 1, exchangeVariantId: 'var-2' }],
    });

    await expect(
      service.create(userId, {
        orderId,
        type: 'exchange',
        reason: 'Wrong size',
        conditionAttested: true,
        items: [{ orderItemId: 'item-1', quantity: 1, exchangeVariantId: 'var-2' }],
      }),
    ).resolves.toMatchObject({
      type: 'exchange',
      status: 'pending',
      orderNumber: 'EA123456',
    });
  });
});

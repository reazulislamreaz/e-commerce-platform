import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderStatus, ReturnStatus, ReturnType } from '@/generated/prisma/client';
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
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.runTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReturnsService,
        { provide: ReturnsRepository, useValue: repository },
        { provide: InventoryService, useValue: { restockReturn: jest.fn() } },
        { provide: AuditService, useValue: { write: jest.fn() } },
        { provide: NotificationsService, useValue: { createForUser: jest.fn() } },
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
      service.create(userId, { orderId, type: 'return', reason: 'Too small' }),
    ).rejects.toBeInstanceOf(BadRequestException);
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
      service.create(userId, { orderId, type: 'return', reason: 'Changed mind' }),
    ).rejects.toThrow('Sale items are exchange only');
  });

  it('allows exchanges for sale items', async () => {
    const deliveredAt = new Date();
    repository.findOrderForReturn.mockResolvedValue({
      id: orderId,
      status: OrderStatus.DELIVERED,
      deliveredAt,
      items: [{ id: 'item-1', variantId: 'var-1', productId: 'prod-1', quantity: 1 }],
    });
    repository.findActiveByOrderId.mockResolvedValue(null);
    repository.findProductsOnSale.mockResolvedValue([{ id: 'prod-1', onSale: true }]);
    repository.create.mockResolvedValue({
      id: 'ret-1',
      orderId,
      userId,
      type: ReturnType.EXCHANGE,
      status: ReturnStatus.PENDING,
      reason: 'Wrong size',
      createdAt: new Date(),
      order: { number: 'EA123456' },
      items: [{ orderItemId: 'item-1', quantity: 1 }],
    });

    await expect(
      service.create(userId, { orderId, type: 'exchange', reason: 'Wrong size' }),
    ).resolves.toMatchObject({
      type: 'exchange',
      status: 'pending',
      orderNumber: 'EA123456',
    });
  });
});

import { Test } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { InventoryRepository } from './inventory.repository';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  const repository = { findBalancesByVariantIds: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: InventoryRepository, useValue: repository },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(InventoryService);
  });

  it('aggregates on-hand minus reserved across active locations', async () => {
    repository.findBalancesByVariantIds.mockResolvedValue([
      { variantId: 'v1', onHand: 10, reserved: 3 },
      { variantId: 'v1', onHand: 4, reserved: 1 },
      { variantId: 'v2', onHand: 2, reserved: 2 },
    ]);

    const result = await service.getAvailableByVariantIds(['v1', 'v2', 'v3']);

    expect(result.get('v1')).toBe(10);
    expect(result.get('v2')).toBe(0);
    expect(result.get('v3')).toBe(0);
  });

  it('deduplicates variant ids before querying', async () => {
    repository.findBalancesByVariantIds.mockResolvedValue([]);
    await service.getAvailableByVariantIds(['v1', 'v1']);
    expect(repository.findBalancesByVariantIds).toHaveBeenCalledWith(['v1']);
  });
});

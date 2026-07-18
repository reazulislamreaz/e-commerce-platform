import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ProductStatus, Role } from '@/generated/prisma/client';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { AuditService } from '@/modules/platform/audit.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AdminCatalogRepository } from './admin-catalog.repository';
import { AdminCatalogService } from './admin-catalog.service';

const actor = {
  sub: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  role: Role.ADMIN,
  sid: 'session-1',
  jti: 'jti-1',
};

describe('AdminCatalogService', () => {
  let service: AdminCatalogService;
  const adminCatalog = {
    findProductById: jest.fn(),
    countPublishRequirements: jest.fn(),
    setProductStatus: jest.fn(),
    toProductDetail: jest.fn(),
  };
  const audit = { write: jest.fn() };
  const inventory = { adjust: jest.fn() };
  const prisma = {
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminCatalogService,
        { provide: AdminCatalogRepository, useValue: adminCatalog },
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryService, useValue: inventory },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = moduleRef.get(AdminCatalogService);
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: object) => unknown) => fn({}));
  });

  describe('assertPublishable', () => {
    it('rejects a product without active variants', async () => {
      adminCatalog.countPublishRequirements.mockResolvedValue([0, 1, 1, { currentPriceAmount: 1000n }]);

      await expect(service.assertPublishable('product-1')).rejects.toThrow(
        new BadRequestException('Product must have at least one active variant to publish'),
      );
    });

    it('rejects a product without media', async () => {
      adminCatalog.countPublishRequirements.mockResolvedValue([1, 0, 1, { currentPriceAmount: 1000n }]);

      await expect(service.assertPublishable('product-1')).rejects.toThrow(
        new BadRequestException('Product must have at least one media item to publish'),
      );
    });

    it('rejects a product without an active price', async () => {
      adminCatalog.countPublishRequirements.mockResolvedValue([1, 1, 0, { currentPriceAmount: 0n }]);

      await expect(service.assertPublishable('product-1')).rejects.toThrow(
        new BadRequestException('Product must have an active price to publish'),
      );
    });
  });

  describe('publishProduct', () => {
    it('rejects publish when variants are missing', async () => {
      adminCatalog.findProductById.mockResolvedValue({
        id: 'product-1',
        status: ProductStatus.DRAFT,
        publishedAt: null,
      });
      adminCatalog.countPublishRequirements.mockResolvedValue([0, 1, 1, { currentPriceAmount: 1000n }]);

      await expect(service.publishProduct(actor, 'product-1')).rejects.toThrow(
        new BadRequestException('Product must have at least one active variant to publish'),
      );
    });
  });
});

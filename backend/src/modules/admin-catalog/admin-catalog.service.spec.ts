import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ProductStatus, Role } from '@/generated/prisma/client';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { AuditService } from '@/modules/platform/audit.service';
import { CatalogCacheService } from '@/modules/catalog/catalog-cache.service';
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
    createProduct: jest.fn(),
    findBrandById: jest.fn(),
    listCategories: jest.fn(),
    updateBrand: jest.fn(),
  };
  const audit = { write: jest.fn() };
  const inventory = { adjust: jest.fn() };
  const catalogCache = { invalidateAll: jest.fn() };
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
        { provide: CatalogCacheService, useValue: catalogCache },
      ],
    }).compile();

    service = moduleRef.get(AdminCatalogService);
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: object) => unknown) => fn({}));
    adminCatalog.findBrandById.mockResolvedValue({ id: '22222222-2222-4222-8222-222222222222' });
    adminCatalog.listCategories.mockResolvedValue([{ id: '33333333-3333-4333-8333-333333333333' }]);
  });

  describe('assertPublishable', () => {
    it('rejects a product without active variants', async () => {
      adminCatalog.countPublishRequirements.mockResolvedValue([
        0,
        1,
        1,
        { currentPriceAmount: 1000n },
      ]);

      await expect(service.assertPublishable('product-1')).rejects.toThrow(
        new BadRequestException('Product must have at least one active variant to publish'),
      );
    });

    it('rejects a product without media', async () => {
      adminCatalog.countPublishRequirements.mockResolvedValue([
        1,
        0,
        1,
        { currentPriceAmount: 1000n },
      ]);

      await expect(service.assertPublishable('product-1')).rejects.toThrow(
        new BadRequestException('Product must have at least one media item to publish'),
      );
    });

    it('rejects a product without an active price', async () => {
      adminCatalog.countPublishRequirements.mockResolvedValue([
        1,
        1,
        0,
        { currentPriceAmount: 0n },
      ]);

      await expect(service.assertPublishable('product-1')).rejects.toThrow(
        new BadRequestException('Product must have an active price to publish'),
      );
    });
  });

  describe('createProduct', () => {
    const dto = {
      name: 'Essential Hoodie',
      brandId: '22222222-2222-4222-8222-222222222222',
      description: 'A heavyweight essential hoodie.',
      primaryColor: 'Black',
      categoryIds: ['33333333-3333-4333-8333-333333333333'],
      colors: [{ name: 'Black', hex: '#111111' }],
      variants: [
        {
          sku: 'EA-HOOD-BLK-M',
          size: 'M',
          color: 'Black',
          openingQuantity: 12,
        },
      ],
      inventoryLocationId: '44444444-4444-4444-8444-444444444444',
      media: [{ url: '/hoodie.webp', alt: 'Essential Hoodie', isPrimary: true }],
      price: { amountTaka: 2499 },
    };

    it('creates opening inventory in the product transaction', async () => {
      const created = {
        id: '55555555-5555-4555-8555-555555555555',
        variants: [{ id: '66666666-6666-4666-8666-666666666666', sku: 'EA-HOOD-BLK-M' }],
      };
      const tx = {
        inventoryLocation: {
          findUnique: jest.fn().mockResolvedValue({ isActive: true }),
        },
      };
      prisma.$transaction.mockImplementationOnce(async (fn: (client: object) => unknown) => fn(tx));
      adminCatalog.createProduct.mockResolvedValue(created);
      adminCatalog.toProductDetail.mockReturnValue(created);

      await service.createProduct(actor, dto);

      expect(inventory.adjust).toHaveBeenCalledWith(
        expect.objectContaining({
          variantId: '66666666-6666-4666-8666-666666666666',
          locationId: dto.inventoryLocationId,
          quantityDelta: 12,
          note: 'Opening stock for EA-HOOD-BLK-M',
        }),
        tx,
      );
    });

    it('requires a location when opening stock is positive', async () => {
      await expect(
        service.createProduct(actor, { ...dto, inventoryLocationId: undefined }),
      ).rejects.toThrow(
        new BadRequestException(
          'An inventory location is required when opening quantity is provided',
        ),
      );
      expect(adminCatalog.createProduct).not.toHaveBeenCalled();
    });
  });

  describe('publishProduct', () => {
    it('rejects publish when variants are missing', async () => {
      adminCatalog.findProductById.mockResolvedValue({
        id: 'product-1',
        status: ProductStatus.DRAFT,
        publishedAt: null,
      });
      adminCatalog.countPublishRequirements.mockResolvedValue([
        0,
        1,
        1,
        { currentPriceAmount: 1000n },
      ]);

      await expect(service.publishProduct(actor, 'product-1')).rejects.toThrow(
        new BadRequestException('Product must have at least one active variant to publish'),
      );
    });
  });

  describe('updateBrand', () => {
    it('updates and returns the storefront status', async () => {
      const createdAt = new Date('2026-07-18T08:00:00.000Z');
      const updatedAt = new Date('2026-07-19T08:00:00.000Z');
      adminCatalog.findBrandById.mockResolvedValue({
        id: 'brand-1',
        name: 'Elevate',
        slug: 'elevate',
        isActive: true,
        createdAt,
        updatedAt: createdAt,
        _count: { products: 3 },
      });
      adminCatalog.updateBrand.mockResolvedValue({
        id: 'brand-1',
        name: 'Elevate',
        slug: 'elevate',
        isActive: false,
        createdAt,
        updatedAt,
        _count: { products: 3 },
      });

      await expect(service.updateBrand(actor, 'brand-1', { isActive: false })).resolves.toEqual({
        id: 'brand-1',
        name: 'Elevate',
        slug: 'elevate',
        isActive: false,
        productCount: 3,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      });
      expect(adminCatalog.updateBrand).toHaveBeenCalledWith('brand-1', { isActive: false });
    });
  });
});

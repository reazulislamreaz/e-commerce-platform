import 'dotenv/config';
import type { CatalogCacheService } from './catalog-cache.service';
import { CatalogRepository } from './catalog.repository';
import { CatalogService } from './catalog.service';
import { InventoryRepository } from '@/modules/inventory/inventory.repository';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('Catalog + Inventory integration', () => {
  const prisma = new PrismaService();
  const catalogRepository = new CatalogRepository(prisma);
  const inventoryRepository = new InventoryRepository(prisma);
  const inventory = new InventoryService(inventoryRepository, prisma);
  const cache = {
    getProductBySlug: async () => null,
    setProductBySlug: async () => undefined,
    getFacets: async () => null,
    setFacets: async () => undefined,
    invalidateAll: async () => undefined,
  } as unknown as CatalogCacheService;
  const catalog = new CatalogService(catalogRepository, inventory, cache);

  beforeAll(() => prisma.$connect());
  afterAll(() => prisma.$disconnect());

  it('filters and sorts seeded products using indexed price projections', async () => {
    const result = await catalog.list({
      minPrice: 2500,
      maxPrice: 3600,
      sort: 'price-asc',
      availability: 'in-stock',
      page: 1,
      pageSize: 100,
    });

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.every((item) => item.price >= 2500 && item.price <= 3600)).toBe(true);
    expect(result.data.every((item) => item.inStock)).toBe(true);
    expect(result.data.map((item) => item.price)).toEqual(
      [...result.data.map((item) => item.price)].sort((a, b) => a - b),
    );
  });

  it('exposes aggregate inventory and published reviews on product detail', async () => {
    const product = await catalog.getBySlug('urban-horizon-distressed-stripe-shirt');
    expect(product.variants).toHaveLength(10);
    const oliveXxl = await prisma.productVariant.findUniqueOrThrow({
      where: { sku: 'P1-OLI-XXL' },
      select: {
        inventoryBalances: {
          where: { location: { isActive: true } },
          select: { onHand: true, reserved: true },
        },
      },
    });
    const expectedAvailable = oliveXxl.inventoryBalances.reduce(
      (total, balance) => total + Math.max(0, balance.onHand - balance.reserved),
      0,
    );
    expect(product.variants.find((variant) => variant.sku === 'P1-OLI-XXL')?.stock).toBe(
      expectedAvailable,
    );
    // Match on the seeded fixture reviews so reviews created by other
    // integration suites (moderation smoke) cannot break this assertion.
    const seededAuthors = product.reviews.map((review) => review.author);
    expect(seededAuthors).toEqual(expect.arrayContaining(['Rahim K.', 'Nadia S.']));
  });

  it('finds the out-of-stock seeded product', async () => {
    const result = await catalog.list({
      sort: 'featured',
      availability: 'out-of-stock',
      page: 1,
      pageSize: 100,
    });
    expect(result.data.map(({ slug }) => slug)).toContain('elevate-signature-rust-floral-shirt');
  });
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ProductStatus, ReviewStatus } from '@/generated/prisma/client';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { CatalogCacheService } from './catalog-cache.service';
import { CatalogRepository, type CatalogProductRecord } from './catalog.repository';
import { CatalogService } from './catalog.service';

const product = {
  id: '11111111-1111-4111-8111-111111111111',
  brandId: '22222222-2222-4222-8222-222222222222',
  legacyKey: 'p1',
  name: 'Elevate Oversized Tee',
  slug: 'urban-horizon-distressed-stripe-shirt',
  description: 'Heavyweight cotton',
  status: ProductStatus.ACTIVE,
  primaryColor: 'Black',
  currentPriceAmount: 119000n,
  currentCompareAtAmount: 149000n,
  currencyCode: 'BDT',
  discountPercent: 20,
  isNew: true,
  onSale: true,
  featuredPosition: 0,
  ratingAverage: 470,
  reviewCount: 28,
  publishedAt: new Date('2026-01-01'),
  deletedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  brand: {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Elevate Apparel',
    slug: 'elevate-apparel',
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  categories: [
    {
      productId: '11111111-1111-4111-8111-111111111111',
      categoryId: '33333333-3333-4333-8333-333333333333',
      isPrimary: true,
      category: {
        id: '33333333-3333-4333-8333-333333333333',
        parentId: '44444444-4444-4444-8444-444444444444',
        name: 'Oversized',
        slug: 't-shirts-oversized',
        position: 0,
        isActive: true,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: {
          id: '44444444-4444-4444-8444-444444444444',
          parentId: null,
          name: 'T-Shirts',
          slug: 't-shirts',
          position: 0,
          isActive: true,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    },
  ],
  collections: [
    {
      productId: '11111111-1111-4111-8111-111111111111',
      collectionId: '55555555-5555-4555-8555-555555555555',
      isPrimary: true,
      collection: {
        id: '55555555-5555-4555-8555-555555555555',
        name: 'Men',
        slug: 'men',
        position: 0,
        isActive: true,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],
  colors: [
    {
      id: 'c1',
      productId: '11111111-1111-4111-8111-111111111111',
      name: 'Black',
      hex: '#111111',
      position: 0,
    },
  ],
  media: [
    {
      id: 'm1',
      productId: '11111111-1111-4111-8111-111111111111',
      url: '/product.webp',
      alt: 'Urban Horizon Distressed Stripe Shirt',
      position: 0,
      isPrimary: true,
    },
  ],
  variants: [
    {
      id: '66666666-6666-4666-8666-666666666666',
      productId: '11111111-1111-4111-8111-111111111111',
      sku: 'P1-BLA-M',
      size: 'M',
      color: 'Black',
      position: 0,
      isActive: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  reviews: [
    {
      id: '77777777-7777-4777-8777-777777777777',
      sourceKey: 'r1',
      productId: '11111111-1111-4111-8111-111111111111',
      userId: null,
      authorName: 'Rahim K.',
      rating: 5,
      title: 'Perfect fit',
      body: 'Excellent.',
      verified: true,
      status: ReviewStatus.PUBLISHED,
      publishedAt: new Date('2026-05-12'),
      deletedAt: null,
      createdAt: new Date('2026-05-12'),
      updatedAt: new Date('2026-05-12'),
    },
  ],
} satisfies CatalogProductRecord;

describe('CatalogService', () => {
  let service: CatalogService;
  const repository = {
    list: jest.fn(),
    findBySlug: jest.fn(),
    findByIdentifier: jest.fn(),
    findByIdentifiers: jest.fn(),
    findRelatedBySlug: jest.fn(),
    facets: jest.fn(),
  };
  const inventory = { getAvailableByVariantIds: jest.fn() };
  const cache = {
    getProductBySlug: jest.fn(),
    setProductBySlug: jest.fn(),
    getFacets: jest.fn(),
    setFacets: jest.fn(),
    invalidateAll: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: CatalogRepository, useValue: repository },
        { provide: InventoryService, useValue: inventory },
        { provide: CatalogCacheService, useValue: cache },
      ],
    }).compile();
    service = moduleRef.get(CatalogService);
    inventory.getAvailableByVariantIds.mockResolvedValue(
      new Map([['66666666-6666-4666-8666-666666666666', 7]]),
    );
    cache.getProductBySlug.mockResolvedValue(null);
    cache.getFacets.mockResolvedValue(null);
  });

  it('maps poisha, taxonomy, inventory, and reviews to the storefront contract', async () => {
    repository.findBySlug.mockResolvedValue(product);

    const result = await service.getBySlug(product.slug);

    expect(result).toEqual(
      expect.objectContaining({
        id: product.id,
        legacyId: 'p1',
        price: 1190,
        compareAtPrice: 1490,
        category: 'T-Shirts',
        subcategory: 'Oversized',
        collection: 'men',
        inStock: true,
        rating: 4.7,
        imageAlts: ['Urban Horizon Distressed Stripe Shirt'],
      }),
    );
    expect(result.variants[0].stock).toBe(7);
    expect(result.reviews[0]).toEqual(
      expect.objectContaining({ author: 'Rahim K.', createdAt: '2026-05-12' }),
    );
    expect(cache.setProductBySlug).toHaveBeenCalledWith(product.slug, result);
  });

  it('returns pagination metadata compatible with the frontend', async () => {
    repository.list.mockResolvedValue({ items: [product], total: 12, page: 1, totalPages: 2 });
    const result = await service.list({
      page: 1,
      pageSize: 8,
      sort: 'featured',
      availability: 'all',
    });
    expect(result.meta).toEqual({ page: 1, pageSize: 8, total: 12, totalPages: 2 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].reviews).toEqual(
      expect.arrayContaining([expect.objectContaining({ author: 'Rahim K.' })]),
    );
  });

  it('filters new arrivals in the repository query', async () => {
    repository.list.mockResolvedValue({ items: [product], total: 1, page: 1, totalPages: 1 });
    await service.newArrivals({ limit: 8 });
    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({ isNew: true, pageSize: 8, sort: 'newest' }),
    );
  });

  it('loads related products without a full PDP fetch for the source slug', async () => {
    repository.findRelatedBySlug.mockResolvedValue([product]);
    await service.related(product.slug, { limit: 4 });
    expect(repository.findRelatedBySlug).toHaveBeenCalledWith(product.slug, 4);
    expect(repository.findBySlug).not.toHaveBeenCalled();
  });

  it('rejects an inverted price range before querying', async () => {
    await expect(
      service.list({
        minPrice: 2000,
        maxPrice: 1000,
        page: 1,
        pageSize: 8,
        sort: 'featured',
        availability: 'all',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.list).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown product slug', async () => {
    repository.findBySlug.mockResolvedValue(null);
    await expect(service.getBySlug('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ReviewStatus, Role } from '@/generated/prisma/client';
import { AuditService } from '@/modules/platform/audit.service';
import { CatalogCacheService } from '@/modules/catalog/catalog-cache.service';
import { ReviewsRepository } from './reviews.repository';
import { ReviewsService } from './reviews.service';

const userId = '11111111-1111-4111-8111-111111111111';
const productId = '22222222-2222-4222-8222-222222222222';
const reviewId = '33333333-3333-4333-8333-333333333333';

describe('ReviewsService', () => {
  let service: ReviewsService;
  const repository = {
    runTransaction: jest.fn(),
    findActiveProduct: jest.fn(),
    findDeliveredPurchase: jest.fn(),
    findActiveByUserAndProduct: jest.fn(),
    findUserAuthorName: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    recomputeProductAggregates: jest.fn(),
    listByUserId: jest.fn(),
    listAdmin: jest.fn(),
  };
  const audit = { write: jest.fn() };
  const catalogCache = { invalidateAll: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.runTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: ReviewsRepository, useValue: repository },
        { provide: AuditService, useValue: audit },
        { provide: CatalogCacheService, useValue: catalogCache },
      ],
    }).compile();

    service = moduleRef.get(ReviewsService);
  });

  it('computes rating averages in centi-stars', () => {
    expect(service.computeRatingAverageCenti([5, 4, 5])).toBe(467);
    expect(service.computeRatingAverageCenti([])).toBe(0);
  });

  it('rejects reviews without a delivered purchase', async () => {
    repository.findActiveProduct.mockResolvedValue({
      id: productId,
      name: 'Tee',
      slug: 'tee',
    });
    repository.findDeliveredPurchase.mockResolvedValue(null);

    await expect(
      service.create(userId, {
        productId,
        rating: 5,
        title: 'Nice',
        body: 'Really comfortable and well made.',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate active reviews', async () => {
    repository.findActiveProduct.mockResolvedValue({
      id: productId,
      name: 'Tee',
      slug: 'tee',
    });
    repository.findDeliveredPurchase.mockResolvedValue({
      id: 'order-1',
      number: 'EA123',
      deliveredAt: new Date(),
    });
    repository.findActiveByUserAndProduct.mockResolvedValue({ id: reviewId });

    await expect(
      service.create(userId, {
        productId,
        rating: 5,
        title: 'Nice',
        body: 'Really comfortable and well made.',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a pending verified review for delivered purchases', async () => {
    repository.findActiveProduct.mockResolvedValue({
      id: productId,
      name: 'Tee',
      slug: 'tee',
    });
    repository.findDeliveredPurchase.mockResolvedValue({
      id: 'order-1',
      number: 'EA123',
      deliveredAt: new Date(),
    });
    repository.findActiveByUserAndProduct.mockResolvedValue(null);
    repository.findUserAuthorName.mockResolvedValue({
      firstName: 'Rahim',
      lastName: 'Khan',
      email: 'rahim@example.com',
    });
    repository.create.mockResolvedValue({
      id: reviewId,
      productId,
      userId,
      authorName: 'Rahim Khan',
      rating: 5,
      title: 'Nice',
      body: 'Really comfortable and well made.',
      verified: true,
      status: ReviewStatus.PENDING,
      publishedAt: null,
      createdAt: new Date('2026-07-18T10:00:00.000Z'),
      product: { id: productId, name: 'Tee', slug: 'tee', status: 'ACTIVE', deletedAt: null },
    });

    await expect(
      service.create(userId, {
        productId,
        rating: 5,
        title: 'Nice',
        body: 'Really comfortable and well made.',
      }),
    ).resolves.toMatchObject({
      id: reviewId,
      status: 'pending',
      verified: true,
      productName: 'Tee',
    });
  });

  it('publishes a review and recomputes aggregates', async () => {
    repository.findById.mockResolvedValue({
      id: reviewId,
      productId,
      userId,
      status: ReviewStatus.PENDING,
      product: { id: productId, name: 'Tee', slug: 'tee', status: 'ACTIVE', deletedAt: null },
      authorName: 'Rahim',
      rating: 5,
      title: 'Nice',
      body: 'Really comfortable and well made.',
      verified: true,
      publishedAt: null,
      createdAt: new Date(),
    });
    repository.update.mockResolvedValue({
      id: reviewId,
      productId,
      userId,
      status: ReviewStatus.PUBLISHED,
      product: { id: productId, name: 'Tee', slug: 'tee', status: 'ACTIVE', deletedAt: null },
      authorName: 'Rahim',
      rating: 5,
      title: 'Nice',
      body: 'Really comfortable and well made.',
      verified: true,
      publishedAt: new Date(),
      createdAt: new Date(),
    });

    await expect(
      service.publish(
        { sub: userId, email: 'admin@example.com', role: Role.ADMIN, sid: 's', jti: 'j' },
        reviewId,
        { note: 'Looks good' },
      ),
    ).resolves.toMatchObject({ status: 'published' });

    expect(repository.recomputeProductAggregates).toHaveBeenCalledWith(productId, {});
    expect(audit.write).toHaveBeenCalled();
  });

  it('404s when updating another user review', async () => {
    repository.findById.mockResolvedValue({
      id: reviewId,
      userId: 'other-user',
      productId,
      status: ReviewStatus.PENDING,
    });

    await expect(
      service.update(userId, reviewId, { title: 'Updated title' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

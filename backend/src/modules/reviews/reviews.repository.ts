import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma, ProductStatus, ReviewStatus } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

const reviewInclude = {
  product: { select: { id: true, name: true, slug: true, status: true, deletedAt: true } },
} satisfies Prisma.ProductReviewInclude;

export type ReviewDetailRecord = Prisma.ProductReviewGetPayload<{
  include: typeof reviewInclude;
}>;

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, tx: Prisma.TransactionClient = this.prisma): Promise<ReviewDetailRecord | null> {
    return tx.productReview.findFirst({
      where: { id, deletedAt: null },
      include: reviewInclude,
    });
  }

  listByUserId(
    userId: string,
    query: { cursor?: string; limit: number; status?: ReviewStatus },
  ): Promise<ReviewDetailRecord[]> {
    return this.prisma.productReview.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
      },
      include: reviewInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
  }

  listAdmin(query: {
    cursor?: string;
    limit: number;
    status?: ReviewStatus;
  }): Promise<ReviewDetailRecord[]> {
    return this.prisma.productReview.findMany({
      where: {
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
      },
      include: reviewInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
  }

  findActiveByUserAndProduct(
    userId: string,
    productId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<ReviewDetailRecord | null> {
    return tx.productReview.findFirst({
      where: { userId, productId, deletedAt: null },
      include: reviewInclude,
    });
  }

  findActiveProduct(productId: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.product.findFirst({
      where: { id: productId, status: ProductStatus.ACTIVE, deletedAt: null },
      select: { id: true, name: true, slug: true },
    });
  }

  findDeliveredPurchase(
    userId: string,
    productId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.customerOrder.findFirst({
      where: {
        userId,
        status: OrderStatus.DELIVERED,
        deliveredAt: { not: null },
        items: { some: { productId } },
      },
      select: { id: true, number: true, deliveredAt: true },
    });
  }

  findUserAuthorName(userId: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    });
  }

  create(
    data: Prisma.ProductReviewCreateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<ReviewDetailRecord> {
    return tx.productReview.create({
      data,
      include: reviewInclude,
    });
  }

  update(
    id: string,
    data: Prisma.ProductReviewUpdateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<ReviewDetailRecord> {
    return tx.productReview.update({
      where: { id },
      data,
      include: reviewInclude,
    });
  }

  softDelete(id: string, tx: Prisma.TransactionClient = this.prisma): Promise<ReviewDetailRecord> {
    return tx.productReview.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: reviewInclude,
    });
  }

  async recomputeProductAggregates(
    productId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const aggregates = await tx.productReview.aggregate({
      where: {
        productId,
        status: ReviewStatus.PUBLISHED,
        deletedAt: null,
      },
      _avg: { rating: true },
      _count: { _all: true },
    });

    const reviewCount = aggregates._count._all;
    const ratingAverage =
      reviewCount === 0 || aggregates._avg.rating == null
        ? 0
        : Math.round(aggregates._avg.rating * 100);

    await tx.product.update({
      where: { id: productId },
      data: { reviewCount, ratingAverage },
    });
  }

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}

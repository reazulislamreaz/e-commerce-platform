import { Injectable } from '@nestjs/common';
import {
  CustomerSegmentKey,
  OrderStatus,
  PaymentStatus,
  Prisma,
  ReturnStatus,
  Role,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CustomerSort, type ListCustomersQueryDto } from './dto/list-customers.query.dto';

const customerSelect = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  status: true,
  createdAt: true,
  customerMetric: true,
} satisfies Prisma.UserSelect;

export type CustomerRecord = Prisma.UserGetPayload<{ select: typeof customerSelect }>;

@Injectable()
export class CrmRepository {
  constructor(private readonly prisma: PrismaService) {}

  listCustomers(query: ListCustomersQueryDto): Promise<CustomerRecord[]> {
    const search = query.search?.trim();
    const segmentFilter = query.segment
      ? query.segment === CustomerSegmentKey.NEW
        ? {
            OR: [
              { customerMetric: null },
              { customerMetric: { is: { segmentKey: CustomerSegmentKey.NEW } } },
            ],
          }
        : { customerMetric: { is: { segmentKey: query.segment } } }
      : {};
    return this.prisma.user.findMany({
      where: {
        role: Role.CUSTOMER,
        deletedAt: null,
        ...segmentFilter,
        ...(search
          ? {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: customerSelect,
      orderBy:
        query.sort === CustomerSort.HIGH_VALUE
          ? [{ customerMetric: { lifetimeValuePoisha: 'desc' } }, { id: 'desc' }]
          : [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
  }

  findCustomer(id: string): Promise<CustomerRecord | null> {
    return this.prisma.user.findFirst({
      where: { id, role: Role.CUSTOMER, deletedAt: null },
      select: customerSelect,
    });
  }

  listOrders(userId: string, query: { cursor?: string; limit: number }) {
    return this.prisma.customerOrder.findMany({
      where: { userId },
      select: {
        id: true,
        number: true,
        status: true,
        totalPoisha: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
  }

  listActivity(userId: string, query: { cursor?: string; limit: number }) {
    return this.prisma.customerActivityEvent.findMany({
      where: { userId },
      select: {
        id: true,
        eventType: true,
        title: true,
        href: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { id: 'desc' },
      take: query.limit + 1,
      ...(query.cursor
        ? { cursor: { id: BigInt(query.cursor) }, skip: 1 }
        : {}),
    });
  }

  /**
   * Counts active (non-deleted) customers by segment.
   * Customers without a metric row are counted as NEW, matching listCustomers.
   */
  async segmentSummary(): Promise<Array<{ segmentKey: CustomerSegmentKey; count: number }>> {
    const [grouped, missingMetric] = await Promise.all([
      this.prisma.customerMetric.groupBy({
        by: ['segmentKey'],
        where: {
          user: { role: Role.CUSTOMER, deletedAt: null },
        },
        _count: { _all: true },
      }),
      this.prisma.user.count({
        where: {
          role: Role.CUSTOMER,
          deletedAt: null,
          customerMetric: null,
        },
      }),
    ]);

    const counts = new Map<CustomerSegmentKey, number>(
      grouped.map((row) => [row.segmentKey, row._count._all]),
    );
    counts.set(
      CustomerSegmentKey.NEW,
      (counts.get(CustomerSegmentKey.NEW) ?? 0) + missingMetric,
    );

    return Object.values(CustomerSegmentKey).map((segmentKey) => ({
      segmentKey,
      count: counts.get(segmentKey) ?? 0,
    }));
  }

  async aggregateMetrics(userId: string, tx: Prisma.TransactionClient = this.prisma) {
    const recognizedRevenueWhere: Prisma.CustomerOrderWhereInput = {
      userId,
      payment: { status: PaymentStatus.COLLECTED },
    };

    const [orders, completedReturns, wishlist, recognized] = await Promise.all([
      tx.customerOrder.aggregate({
        where: { userId },
        _count: { _all: true },
        _min: { createdAt: true },
        _max: { createdAt: true },
      }),
      tx.returnRequest.count({ where: { userId, status: ReturnStatus.COMPLETED } }),
      tx.wishlist.findUnique({
        where: { userId },
        select: { _count: { select: { items: true } } },
      }),
      tx.customerOrder.aggregate({
        where: recognizedRevenueWhere,
        _count: { _all: true },
        _sum: { totalPoisha: true },
        _max: { updatedAt: true },
      }),
    ]);

    const cancelled = await tx.customerOrder.count({
      where: { userId, status: OrderStatus.CANCELLED },
    });

    return {
      orderCount: orders._count._all,
      deliveredOrderCount: recognized._count._all,
      lifetimeValuePoisha: recognized._sum.totalPoisha ?? 0n,
      firstOrderAt: orders._min.createdAt,
      lastOrderAt: orders._max.createdAt,
      lastRecognizedOrderAt: recognized._max.updatedAt,
      cancelledOrderCount: cancelled,
      returnCount: completedReturns,
      wishlistItemCount: wishlist?._count.items ?? 0,
    };
  }

  findCustomersNeedingBackfill(limit: number): Promise<Array<{ id: string }>> {
    return this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT u.id
      FROM "User" u
      LEFT JOIN customer_metric cm ON cm."userId" = u.id
      WHERE u.role = ${Role.CUSTOMER}::"Role"
        AND u."deletedAt" IS NULL
        AND (
          cm."userId" IS NULL
          OR cm."updatedAt" < COALESCE(
            (
              SELECT MAX(o."updatedAt")
              FROM customer_order o
              WHERE o."userId" = u.id
            ),
            cm."updatedAt"
          )
          OR cm."updatedAt" < COALESCE(
            (
              SELECT MAX(w."updatedAt")
              FROM wishlist w
              WHERE w."userId" = u.id
            ),
            cm."updatedAt"
          )
          OR cm."updatedAt" < COALESCE(
            (
              SELECT MAX(r."updatedAt")
              FROM return_request r
              WHERE r."userId" = u.id
            ),
            cm."updatedAt"
          )
        )
      ORDER BY cm."updatedAt" ASC NULLS FIRST, u."createdAt" ASC
      LIMIT ${limit}
    `;
  }

  saveMetrics(
    userId: string,
    metric: {
      orderCount: number;
      deliveredOrderCount: number;
      lifetimeValuePoisha: bigint;
      averageOrderPoisha: bigint;
      firstOrderAt: Date | null;
      lastOrderAt: Date | null;
      cancelledOrderCount: number;
      returnCount: number;
      wishlistItemCount: number;
      segmentKey: CustomerSegmentKey;
    },
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.customerMetric.upsert({
      where: { userId },
      create: { userId, ...metric },
      update: metric,
    });
  }

  async replaceSegment(
    userId: string,
    segmentKey: CustomerSegmentKey,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await tx.customerSegmentMember.deleteMany({ where: { userId } });
    await tx.customerSegmentMember.create({ data: { userId, segmentKey } });
  }

  recordActivity(
    data: {
      userId: string;
      eventType: string;
      title: string;
      href?: string;
      metadata?: Prisma.InputJsonValue;
    },
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.customerActivityEvent.create({
      data: {
        userId: data.userId,
        eventType: data.eventType,
        title: data.title,
        href: data.href,
        metadata: data.metadata,
      },
    });
  }

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}

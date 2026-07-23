import { Injectable } from '@nestjs/common';
import { Prisma, ProductStatus } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

const checkoutVariantInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      deletedAt: true,
      publishedAt: true,
      currentPriceAmount: true,
      media: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true },
      },
    },
  },
} satisfies Prisma.ProductVariantInclude;

export type CheckoutVariantRecord = Prisma.ProductVariantGetPayload<{
  include: typeof checkoutVariantInclude;
}>;

const shipmentInclude = {
  deliveryPartner: true,
  assignedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ShipmentInclude;

const statusHistoryInclude = {
  orderBy: { createdAt: 'asc' as const },
  include: {
    actor: { select: { id: true, firstName: true, lastName: true } },
  },
} satisfies Prisma.CustomerOrder$statusHistoryArgs;

const orderDetailInclude = {
  address: true,
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      variant: { select: { sku: true } },
    },
  },
  statusHistory: statusHistoryInclude,
  payment: true,
  shipments: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    include: shipmentInclude,
  },
} satisfies Prisma.CustomerOrderInclude;

export type OrderDetailRecord = Prisma.CustomerOrderGetPayload<{
  include: typeof orderDetailInclude;
}>;

const activeProductWhere = {
  status: ProductStatus.ACTIVE,
  deletedAt: null,
  publishedAt: { not: null },
} satisfies Prisma.ProductWhereInput;

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  get detailInclude() {
    return orderDetailInclude;
  }

  findActiveVariantsByIds(variantIds: string[]): Promise<CheckoutVariantRecord[]> {
    if (variantIds.length === 0) return Promise.resolve([]);
    return this.prisma.productVariant.findMany({
      where: {
        id: { in: variantIds },
        isActive: true,
        deletedAt: null,
        product: activeProductWhere,
      },
      include: checkoutVariantInclude,
    });
  }

  findById(orderId: string): Promise<OrderDetailRecord | null> {
    return this.prisma.customerOrder.findUnique({
      where: { id: orderId },
      include: orderDetailInclude,
    });
  }

  findByNumberAndEmail(number: string, email: string): Promise<OrderDetailRecord | null> {
    return this.prisma.customerOrder.findFirst({
      where: {
        number: { equals: number, mode: 'insensitive' },
        email: { equals: email, mode: 'insensitive' },
      },
      include: orderDetailInclude,
    });
  }

  listByUserId(
    userId: string,
    query: { cursor?: string; limit: number },
  ): Promise<OrderDetailRecord[]> {
    return this.prisma.customerOrder.findMany({
      where: { userId },
      include: orderDetailInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
  }

  listAdmin(query: {
    cursor?: string;
    limit: number;
    status?: Prisma.EnumOrderStatusFilter['equals'];
    number?: string;
    email?: string;
  }): Promise<OrderDetailRecord[]> {
    const where: Prisma.CustomerOrderWhereInput = {
      status: query.status,
      ...(query.number ? { number: { contains: query.number, mode: 'insensitive' } } : {}),
      ...(query.email ? { email: { equals: query.email, mode: 'insensitive' } } : {}),
    };

    return this.prisma.customerOrder.findMany({
      where,
      include: orderDetailInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
  }

  countAdmin(where: Prisma.CustomerOrderWhereInput) {
    return this.prisma.customerOrder.count({ where });
  }

  listAdminOffset(args: {
    where: Prisma.CustomerOrderWhereInput;
    orderBy: Prisma.CustomerOrderOrderByWithRelationInput[];
    skip: number;
    take: number;
  }): Promise<OrderDetailRecord[]> {
    return this.prisma.customerOrder.findMany({
      where: args.where,
      include: orderDetailInclude,
      orderBy: args.orderBy,
      skip: args.skip,
      take: args.take,
    });
  }

  findShipmentByOrderId(orderId: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.shipment.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      include: shipmentInclude,
    });
  }

  groupStatusCounts() {
    return this.prisma.customerOrder.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
  }

  countCreatedSince(since: Date) {
    return this.prisma.customerOrder.count({
      where: { createdAt: { gte: since } },
    });
  }

  aggregatedCollectedRevenue() {
    return this.prisma.payment.aggregate({
      where: { status: 'COLLECTED' },
      _sum: { amountPoisha: true },
      _count: { _all: true },
      _avg: { amountPoisha: true },
    });
  }
}

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

const orderDetailInclude = {
  address: true,
  items: { orderBy: { createdAt: 'asc' as const } },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  shipments: { orderBy: { createdAt: 'desc' as const }, take: 1 },
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
      ...(query.number
        ? { number: { contains: query.number, mode: 'insensitive' } }
        : {}),
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

  findShipmentByOrderId(orderId: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.shipment.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

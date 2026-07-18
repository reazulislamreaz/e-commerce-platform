import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma, ReturnStatus } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

const returnInclude = {
  order: { select: { id: true, number: true, userId: true, status: true, deliveredAt: true } },
  items: { select: { id: true, orderItemId: true, variantId: true, quantity: true } },
} satisfies Prisma.ReturnRequestInclude;

export type ReturnDetailRecord = Prisma.ReturnRequestGetPayload<{
  include: typeof returnInclude;
}>;

@Injectable()
export class ReturnsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<ReturnDetailRecord | null> {
    return this.prisma.returnRequest.findUnique({
      where: { id },
      include: returnInclude,
    });
  }

  listByUserId(
    userId: string,
    query: { cursor?: string; limit: number },
  ): Promise<ReturnDetailRecord[]> {
    return this.prisma.returnRequest.findMany({
      where: { userId },
      include: returnInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
  }

  listAdmin(query: {
    cursor?: string;
    limit: number;
    status?: ReturnStatus;
  }): Promise<ReturnDetailRecord[]> {
    return this.prisma.returnRequest.findMany({
      where: { status: query.status },
      include: returnInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
  }

  findActiveByOrderId(orderId: string): Promise<ReturnDetailRecord | null> {
    return this.prisma.returnRequest.findFirst({
      where: {
        orderId,
        status: { in: [ReturnStatus.PENDING, ReturnStatus.APPROVED] },
      },
      include: returnInclude,
    });
  }

  findOrderForReturn(
    orderId: string,
    userId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.customerOrder.findFirst({
      where: { id: orderId, userId },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  findProductsOnSale(productIds: string[], tx: Prisma.TransactionClient = this.prisma) {
    if (productIds.length === 0) return Promise.resolve([]);
    return tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, onSale: true },
    });
  }

  create(
    data: Prisma.ReturnRequestCreateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<ReturnDetailRecord> {
    return tx.returnRequest.create({
      data,
      include: returnInclude,
    });
  }

  updateStatus(
    id: string,
    data: Prisma.ReturnRequestUpdateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<ReturnDetailRecord> {
    return tx.returnRequest.update({
      where: { id },
      data,
      include: returnInclude,
    });
  }

  appendStatusHistory(
    data: {
      returnRequestId: string;
      status: ReturnStatus;
      note?: string | null;
      actorId?: string | null;
    },
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.returnStatusHistory.create({ data });
  }

  markOrderReturned(orderId: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.customerOrder.update({
      where: { id: orderId },
      data: { status: OrderStatus.RETURNED },
    });
  }

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}

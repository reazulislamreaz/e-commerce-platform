import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma, ReturnStatus, ReturnType } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export const returnOrderSelect = {
  id: true,
  number: true,
  userId: true,
  email: true,
  status: true,
  deliveredAt: true,
  user: { select: { firstName: true } },
} satisfies Prisma.CustomerOrderSelect;

const returnInclude = {
  order: { select: returnOrderSelect },
  items: {
    select: {
      id: true,
      orderItemId: true,
      variantId: true,
      quantity: true,
      exchangeVariantId: true,
    },
  },
} satisfies Prisma.ReturnRequestInclude;

export type ReturnDetailRecord = Prisma.ReturnRequestGetPayload<{
  include: typeof returnInclude;
}>;

const ACTIVE_RETURN_STATUSES: ReturnStatus[] = [
  ReturnStatus.PENDING,
  ReturnStatus.APPROVED,
  ReturnStatus.COMPLETED,
];

@Injectable()
export class ReturnsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<ReturnDetailRecord | null> {
    return tx.returnRequest.findUnique({
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

  findActiveByOrderId(
    orderId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<ReturnDetailRecord | null> {
    return tx.returnRequest.findFirst({
      where: {
        orderId,
        status: { in: [ReturnStatus.PENDING, ReturnStatus.APPROVED] },
      },
      include: returnInclude,
    });
  }

  findOrderForReturn(orderId: string, userId: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.customerOrder.findFirst({
      where: { id: orderId, userId },
      include: {
        user: { select: { firstName: true } },
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

  findActiveVariantsByIds(variantIds: string[], tx: Prisma.TransactionClient = this.prisma) {
    if (variantIds.length === 0) return Promise.resolve([]);
    return tx.productVariant.findMany({
      where: {
        id: { in: variantIds },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, productId: true, size: true, color: true },
    });
  }

  async sumReturnQuantitiesByOrderItem(
    orderId: string,
    statuses: ReturnStatus[],
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Map<string, number>> {
    const rows = await tx.returnItem.findMany({
      where: {
        returnRequest: {
          orderId,
          status: { in: statuses },
        },
      },
      select: { orderItemId: true, quantity: true },
    });

    const totals = new Map<string, number>();
    for (const row of rows) {
      totals.set(row.orderItemId, (totals.get(row.orderItemId) ?? 0) + row.quantity);
    }
    return totals;
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

  async applyOrderOutcomeAfterCompletion(
    orderId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const order = await tx.customerOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.status !== OrderStatus.DELIVERED) return;

    const completedQty = await this.sumReturnQuantitiesByOrderItem(
      orderId,
      [ReturnStatus.COMPLETED],
      tx,
    );

    const allLinesFullyProcessed = order.items.every(
      (item) => (completedQty.get(item.id) ?? 0) >= item.quantity,
    );
    if (!allLinesFullyProcessed) return;

    const hasCompletedExchange = await tx.returnRequest.findFirst({
      where: { orderId, status: ReturnStatus.COMPLETED, type: ReturnType.EXCHANGE },
      select: { id: true },
    });

    const now = new Date();
    const nextStatus = hasCompletedExchange ? OrderStatus.EXCHANGED : OrderStatus.RETURNED;

    await tx.customerOrder.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        ...(nextStatus === OrderStatus.EXCHANGED ? { exchangedAt: now } : { returnedAt: now }),
        version: { increment: 1 },
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: nextStatus,
        note: nextStatus === OrderStatus.EXCHANGED ? 'All items exchanged' : 'All items returned',
      },
    });
  }

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}

export { ACTIVE_RETURN_STATUSES };

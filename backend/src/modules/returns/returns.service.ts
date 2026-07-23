import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationType,
  OrderStatus,
  Prisma,
  ReturnStatus,
  ReturnType,
} from '@/generated/prisma/client';
import { buildOffsetMeta, resolveOffsetPagination } from '@/common/pagination/offset-pagination';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { CustomerMetricsService } from '@/modules/crm/customer-metrics.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { AuditService } from '@/modules/platform/audit.service';
import { OUTBOX_EVENT, OutboxService } from '@/modules/platform/outbox.service';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import type { AdminReturnActionDto } from './dto/admin-return-action.dto';
import type { CreateReturnDto } from './dto/create-return.dto';
import type { ListAdminReturnsQueryDto, ListReturnsQueryDto } from './dto/list-returns.query.dto';
import type { ReturnDetailResponseDto, ReturnRequestResponseDto } from './dto/return-response.dto';
import {
  ACTIVE_RETURN_STATUSES,
  ReturnsRepository,
  returnOrderSelect,
  type ReturnDetailRecord,
} from './returns.repository';

const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type ResolvedReturnLine = {
  orderItemId: string;
  variantId: string;
  quantity: number;
  exchangeVariantId?: string;
};

@Injectable()
export class ReturnsService {
  constructor(
    private readonly returns: ReturnsRepository,
    private readonly inventory: InventoryService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly customerMetrics: CustomerMetricsService,
    private readonly outbox: OutboxService,
  ) {}

  async create(userId: string, dto: CreateReturnDto): Promise<ReturnRequestResponseDto> {
    if (!dto.conditionAttested) {
      throw new BadRequestException('You must attest that items are unworn with tags attached');
    }

    return this.returns.runTransaction(async (tx) => {
      const order = await this.returns.findOrderForReturn(dto.orderId, userId, tx);
      if (!order) throw new NotFoundException('Order not found');

      this.assertReturnEligibility(order.status, order.deliveredAt);

      const existing = await this.returns.findActiveByOrderId(order.id, tx);
      if (existing) {
        throw new BadRequestException('An active return request already exists for this order');
      }

      const returnType = mapApiTypeToPrisma(dto.type);
      const lines = await this.resolveReturnLines(order.items, dto, returnType, order.id, tx);

      const created = await this.returns.create(
        {
          order: { connect: { id: order.id } },
          user: { connect: { id: userId } },
          type: returnType,
          reason: dto.reason.trim(),
          conditionAttested: dto.conditionAttested,
          items: {
            create: lines.map((line) => ({
              orderItemId: line.orderItemId,
              variantId: line.variantId,
              quantity: line.quantity,
              ...(line.exchangeVariantId ? { exchangeVariantId: line.exchangeVariantId } : {}),
            })),
          },
          statusHistory: {
            create: {
              status: ReturnStatus.PENDING,
              note: 'Return requested',
            },
          },
        },
        tx,
      );

      await this.notifications.createForUser(
        {
          userId,
          type:
            returnType === ReturnType.EXCHANGE
              ? NotificationType.EXCHANGE_STATUS
              : NotificationType.RETURN_STATUS,
          title: returnType === ReturnType.EXCHANGE ? 'Exchange requested' : 'Return requested',
          body: `Your ${dto.type} request for order ${order.number} was submitted.`,
          href: returnType === ReturnType.EXCHANGE ? '/account/exchanges' : '/account/returns',
          dedupeKey: `return:${created.id}:pending`,
          payload: { returnId: created.id, status: ReturnStatus.PENDING },
        },
        tx,
      );
      await this.enqueueStatusEmail(created.id, order, returnType, ReturnStatus.PENDING, tx);

      return toSummaryResponse(created);
    });
  }

  async listMine(userId: string, query: ListReturnsQueryDto) {
    const rows = await this.returns.listByUserId(userId, query);
    return this.toCursorPage(rows, query.limit, toSummaryResponse);
  }

  async getMine(userId: string, id: string): Promise<ReturnDetailResponseDto> {
    const row = await this.getOwnedOrThrow(userId, id);
    return toDetailResponse(row);
  }

  async listAdmin(query: ListAdminReturnsQueryDto) {
    const { page, pageSize, skip, take } = resolveOffsetPagination(query);
    const { rows, total } = await this.returns.listAdmin({ skip, take, status: query.status });
    return {
      data: rows.map(toDetailResponse),
      meta: buildOffsetMeta(page, pageSize, total),
    };
  }

  async getAdmin(id: string): Promise<ReturnDetailResponseDto> {
    const row = await this.returns.findById(id);
    if (!row) throw new NotFoundException('Return request not found');
    return toDetailResponse(row);
  }

  async approve(actor: JwtPayload, id: string, dto: AdminReturnActionDto) {
    return this.returns.runTransaction(async (tx) => {
      const current = await tx.returnRequest.findUnique({
        where: { id },
        include: {
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
        },
      });
      if (!current) throw new NotFoundException('Return request not found');

      if (current.status !== ReturnStatus.PENDING) {
        throw new BadRequestException(`Cannot approve a ${current.status.toLowerCase()} return`);
      }

      if (current.type === ReturnType.EXCHANGE) {
        const exchangeLines = current.items.filter((item) => item.exchangeVariantId);
        if (exchangeLines.length !== current.items.length) {
          throw new BadRequestException(
            'Exchange approval requires replacement variants on every line',
          );
        }
        await this.inventory.reserveExchangeReplacements(
          current.id,
          exchangeLines.map((item) => ({
            variantId: item.exchangeVariantId!,
            quantity: item.quantity,
          })),
          tx,
        );
      }

      const updated = await this.returns.updateStatus(
        id,
        { status: ReturnStatus.APPROVED, decidedAt: new Date() },
        tx,
      );

      await this.returns.appendStatusHistory(
        {
          returnRequestId: id,
          status: ReturnStatus.APPROVED,
          note: dto.note?.trim() || null,
          actorId: actor.sub,
        },
        tx,
      );

      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: 'return.approve',
          resourceType: 'return_request',
          resourceId: id,
          before: { status: current.status },
          after: { status: ReturnStatus.APPROVED, note: dto.note ?? null },
        },
        tx,
      );

      const isExchange = current.type === ReturnType.EXCHANGE;
      const requestLabel = isExchange ? 'exchange' : 'return';
      await this.notifications.createForUser(
        {
          userId: current.userId,
          type: isExchange ? NotificationType.EXCHANGE_STATUS : NotificationType.RETURN_STATUS,
          title: isExchange ? 'Exchange approved' : 'Return approved',
          body: `Your ${requestLabel} for order ${current.order.number} was approved.`,
          href: isExchange ? '/account/exchanges' : '/account/returns',
          dedupeKey: `return:${id}:${ReturnStatus.APPROVED}`,
          payload: { returnId: id, status: ReturnStatus.APPROVED },
        },
        tx,
      );
      await this.enqueueStatusEmail(
        id,
        current.order,
        current.type,
        ReturnStatus.APPROVED,
        tx,
        dto.note,
      );

      return toDetailResponse(updated);
    });
  }

  async reject(actor: JwtPayload, id: string, dto: AdminReturnActionDto) {
    return this.returns.runTransaction(async (tx) => {
      const current = await tx.returnRequest.findUnique({
        where: { id },
        include: {
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
        },
      });
      if (!current) throw new NotFoundException('Return request not found');

      const canRejectPending = current.status === ReturnStatus.PENDING;
      const canVoidApprovedExchange =
        current.status === ReturnStatus.APPROVED && current.type === ReturnType.EXCHANGE;
      if (!canRejectPending && !canVoidApprovedExchange) {
        throw new BadRequestException(
          `Cannot reject a ${current.status.toLowerCase()} ${current.type.toLowerCase()}`,
        );
      }

      if (canVoidApprovedExchange) {
        await this.inventory.releaseExchangeReplacements(current.id, tx);
      }

      const updated = await this.returns.updateStatus(
        id,
        { status: ReturnStatus.REJECTED, decidedAt: new Date() },
        tx,
      );

      await this.returns.appendStatusHistory(
        {
          returnRequestId: id,
          status: ReturnStatus.REJECTED,
          note: dto.note?.trim() || null,
          actorId: actor.sub,
        },
        tx,
      );

      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: 'return.reject',
          resourceType: 'return_request',
          resourceId: id,
          before: { status: current.status },
          after: { status: ReturnStatus.REJECTED, note: dto.note ?? null },
        },
        tx,
      );

      const isExchange = current.type === ReturnType.EXCHANGE;
      const requestLabel = isExchange ? 'exchange' : 'return';
      await this.notifications.createForUser(
        {
          userId: current.userId,
          type: isExchange ? NotificationType.EXCHANGE_STATUS : NotificationType.RETURN_STATUS,
          title: isExchange ? 'Exchange rejected' : 'Return rejected',
          body: `Your ${requestLabel} for order ${current.order.number} was rejected.`,
          href: isExchange ? '/account/exchanges' : '/account/returns',
          dedupeKey: `return:${id}:${ReturnStatus.REJECTED}`,
          payload: { returnId: id, status: ReturnStatus.REJECTED, type: current.type },
        },
        tx,
      );
      await this.enqueueStatusEmail(
        id,
        current.order,
        current.type,
        ReturnStatus.REJECTED,
        tx,
        dto.note,
      );

      return toDetailResponse(updated);
    });
  }

  async complete(actor: JwtPayload, id: string, dto: AdminReturnActionDto) {
    return this.returns.runTransaction(async (tx) => {
      const locked = await tx.$queryRaw<
        Array<{ id: string; status: ReturnStatus; version: number }>
      >`
        SELECT id, status, version
        FROM return_request
        WHERE id = ${id}::uuid
        FOR UPDATE
      `;
      if (!locked[0]) throw new NotFoundException('Return request not found');

      const current = await tx.returnRequest.findUnique({
        where: { id },
        include: {
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
        },
      });
      if (!current) throw new NotFoundException('Return request not found');

      if (current.status === ReturnStatus.COMPLETED) {
        return toDetailResponse(
          (await this.returns.findById(id, tx)) ??
            (() => {
              throw new NotFoundException('Return request not found');
            })(),
        );
      }

      if (current.status !== ReturnStatus.APPROVED) {
        throw new BadRequestException('Only approved return requests can be completed');
      }

      await this.inventory.restockReturn(
        current.id,
        current.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        tx,
      );

      if (current.type === ReturnType.EXCHANGE) {
        const exchangeLines = current.items.filter((item) => item.exchangeVariantId);
        if (exchangeLines.length !== current.items.length) {
          throw new BadRequestException(
            'Exchange completion requires replacement variants on every line',
          );
        }
        await this.inventory.consumeExchangeReplacements(
          current.id,
          exchangeLines.map((item) => ({
            variantId: item.exchangeVariantId!,
            quantity: item.quantity,
          })),
          tx,
        );
      }

      const updated = await this.returns.updateStatus(
        id,
        {
          status: ReturnStatus.COMPLETED,
          completedAt: new Date(),
          version: { increment: 1 },
        },
        tx,
      );

      await this.returns.appendStatusHistory(
        {
          returnRequestId: id,
          status: ReturnStatus.COMPLETED,
          note: dto.note?.trim() || null,
          actorId: actor.sub,
        },
        tx,
      );

      await this.returns.applyOrderOutcomeAfterCompletion(current.orderId, tx);

      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: 'return.complete',
          resourceType: 'return_request',
          resourceId: id,
          before: { status: current.status },
          after: { status: ReturnStatus.COMPLETED, orderId: current.orderId, type: current.type },
        },
        tx,
      );

      const isExchange = current.type === ReturnType.EXCHANGE;
      await this.notifications.createForUser(
        {
          userId: current.userId,
          type: isExchange ? NotificationType.EXCHANGE_STATUS : NotificationType.RETURN_STATUS,
          title: isExchange ? 'Exchange completed' : 'Return completed',
          body: isExchange
            ? `Your exchange for order ${current.order.number} has been completed.`
            : `Your return for order ${current.order.number} has been completed.`,
          href: isExchange ? '/account/exchanges' : '/account/returns',
          dedupeKey: `return:${id}:completed`,
          payload: { returnId: id, status: ReturnStatus.COMPLETED, type: current.type },
        },
        tx,
      );
      await this.enqueueStatusEmail(
        id,
        current.order,
        current.type,
        ReturnStatus.COMPLETED,
        tx,
        dto.note,
      );
      await this.customerMetrics.recordActivity(
        current.userId,
        'RETURN_COMPLETED',
        `Return for order ${current.order.number} completed`,
        '/account/returns',
        { returnId: id, orderId: current.orderId },
        tx,
      );
      await this.customerMetrics.recomputeForUser(current.userId, tx);

      return toDetailResponse(updated);
    });
  }

  private async enqueueStatusEmail(
    returnId: string,
    order: {
      number: string;
      email: string;
      user: { firstName: string | null } | null;
    },
    type: ReturnType,
    status: ReturnStatus,
    tx: Prisma.TransactionClient,
    note?: string,
  ): Promise<void> {
    const requestType = type === ReturnType.EXCHANGE ? 'exchange' : 'return';
    await this.outbox.enqueue(
      OUTBOX_EVENT.RETURN_STATUS_EMAIL,
      returnId,
      {
        to: order.email,
        firstName: order.user?.firstName ?? '',
        orderNumber: order.number,
        requestType,
        status: status.toLowerCase(),
        requestUrl: requestType === 'exchange' ? '/account/exchanges' : '/account/returns',
        ...(note?.trim() ? { note: note.trim() } : {}),
      },
      tx,
    );
  }

  private assertReturnEligibility(status: OrderStatus, deliveredAt: Date | null): void {
    if (status !== OrderStatus.DELIVERED || !deliveredAt) {
      throw new BadRequestException('Order must be delivered before requesting a return');
    }
    const deadline = deliveredAt.getTime() + RETURN_WINDOW_MS;
    if (Date.now() > deadline) {
      throw new BadRequestException('Return window has expired');
    }
  }

  private async resolveReturnLines(
    orderItems: Array<{
      id: string;
      variantId: string;
      productId: string;
      quantity: number;
    }>,
    dto: CreateReturnDto,
    returnType: ReturnType,
    orderId: string,
    tx: Prisma.TransactionClient,
  ): Promise<ResolvedReturnLine[]> {
    const requested = this.buildRequestedLines(orderItems, dto.items);
    const priorQty = await this.returns.sumReturnQuantitiesByOrderItem(
      orderId,
      ACTIVE_RETURN_STATUSES,
      tx,
    );

    const products = await this.returns.findProductsOnSale(
      [...new Set(orderItems.map((item) => item.productId))],
      tx,
    );
    const saleByProductId = new Map(products.map((product) => [product.id, product.onSale]));

    const exchangeVariantIds = requested
      .map((line) => line.exchangeVariantId)
      .filter((id): id is string => Boolean(id));
    const exchangeVariants = await this.returns.findActiveVariantsByIds(exchangeVariantIds, tx);
    const exchangeVariantById = new Map(exchangeVariants.map((variant) => [variant.id, variant]));

    const orderItemById = new Map(orderItems.map((item) => [item.id, item]));
    const lines: ResolvedReturnLine[] = [];

    for (const line of requested) {
      const orderItem = orderItemById.get(line.orderItemId);
      if (!orderItem) {
        throw new BadRequestException('One or more return items are invalid for this order');
      }

      const alreadyReturned = priorQty.get(orderItem.id) ?? 0;
      const remaining = orderItem.quantity - alreadyReturned;
      if (line.quantity > remaining) {
        throw new BadRequestException('Return quantity exceeds remaining returnable quantity');
      }

      if (returnType === ReturnType.RETURN && saleByProductId.get(orderItem.productId)) {
        throw new BadRequestException('Sale items are exchange only');
      }

      if (returnType === ReturnType.EXCHANGE) {
        if (!line.exchangeVariantId) {
          throw new BadRequestException(
            'Exchange requests require a replacement variant for each line',
          );
        }
        const replacement = exchangeVariantById.get(line.exchangeVariantId);
        if (!replacement) {
          throw new BadRequestException('One or more exchange variants are unavailable');
        }
        if (replacement.productId !== orderItem.productId) {
          throw new BadRequestException('Exchange variants must belong to the same product');
        }
      } else if (line.exchangeVariantId) {
        throw new BadRequestException('Replacement variants are only allowed for exchanges');
      }

      lines.push({
        orderItemId: orderItem.id,
        variantId: orderItem.variantId,
        quantity: line.quantity,
        ...(line.exchangeVariantId ? { exchangeVariantId: line.exchangeVariantId } : {}),
      });
    }

    return lines;
  }

  private buildRequestedLines(
    orderItems: Array<{ id: string; variantId: string; quantity: number }>,
    requested?: CreateReturnDto['items'],
  ): Array<{
    orderItemId: string;
    quantity: number;
    exchangeVariantId?: string;
  }> {
    if (!requested || requested.length === 0) {
      return orderItems.map((item) => ({
        orderItemId: item.id,
        quantity: item.quantity,
      }));
    }

    const byId = new Map(orderItems.map((item) => [item.id, item]));
    const lines: Array<{
      orderItemId: string;
      quantity: number;
      exchangeVariantId?: string;
    }> = [];

    for (const line of requested) {
      const orderItem = byId.get(line.orderItemId);
      if (!orderItem) {
        throw new BadRequestException('One or more return items are invalid for this order');
      }
      if (line.quantity > orderItem.quantity) {
        throw new BadRequestException('Return quantity exceeds the ordered quantity');
      }
      lines.push({
        orderItemId: orderItem.id,
        quantity: line.quantity,
        ...(line.exchangeVariantId ? { exchangeVariantId: line.exchangeVariantId } : {}),
      });
    }

    return lines;
  }

  private async getOwnedOrThrow(userId: string, id: string): Promise<ReturnDetailRecord> {
    const row = await this.returns.findById(id);
    if (!row || row.userId !== userId) {
      throw new NotFoundException('Return request not found');
    }
    return row;
  }

  private toCursorPage<T>(
    rows: ReturnDetailRecord[],
    limit: number,
    mapper: (row: ReturnDetailRecord) => T,
  ) {
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      data: page.map(mapper),
      meta: {
        limit,
        nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      },
    };
  }
}

function mapApiTypeToPrisma(type: CreateReturnDto['type']): ReturnType {
  return type === 'exchange' ? ReturnType.EXCHANGE : ReturnType.RETURN;
}

function mapStatusToApi(status: ReturnStatus): ReturnRequestResponseDto['status'] {
  return status.toLowerCase() as ReturnRequestResponseDto['status'];
}

function mapTypeToApi(type: ReturnType): ReturnRequestResponseDto['type'] {
  return type === ReturnType.EXCHANGE ? 'exchange' : 'return';
}

function toSummaryResponse(row: ReturnDetailRecord): ReturnRequestResponseDto {
  return {
    id: row.id,
    orderId: row.orderId,
    orderNumber: row.order.number,
    reason: row.reason,
    status: mapStatusToApi(row.status),
    createdAt: row.createdAt.toISOString(),
    type: mapTypeToApi(row.type),
  };
}

function toDetailResponse(row: ReturnDetailRecord): ReturnDetailResponseDto {
  return {
    ...toSummaryResponse(row),
    items: row.items.map((item) => ({
      orderItemId: item.orderItemId,
      quantity: item.quantity,
      ...(item.exchangeVariantId ? { exchangeVariantId: item.exchangeVariantId } : {}),
    })),
  };
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  ReturnStatus,
  ReturnType,
} from '@/generated/prisma/client';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { AuditService } from '@/modules/platform/audit.service';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import type { AdminReturnActionDto } from './dto/admin-return-action.dto';
import type { CreateReturnDto } from './dto/create-return.dto';
import type { ListReturnsQueryDto } from './dto/list-returns.query.dto';
import type { ReturnDetailResponseDto, ReturnRequestResponseDto } from './dto/return-response.dto';
import { ReturnsRepository, type ReturnDetailRecord } from './returns.repository';

const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class ReturnsService {
  constructor(
    private readonly returns: ReturnsRepository,
    private readonly inventory: InventoryService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateReturnDto): Promise<ReturnRequestResponseDto> {
    return this.returns.runTransaction(async (tx) => {
      const order = await this.returns.findOrderForReturn(dto.orderId, userId, tx);
      if (!order) throw new NotFoundException('Order not found');

      this.assertReturnEligibility(order.status, order.deliveredAt);

      const existing = await this.returns.findActiveByOrderId(order.id);
      if (existing) {
        throw new BadRequestException('An active return request already exists for this order');
      }

      const returnType = mapApiTypeToPrisma(dto.type);
      const lines = this.resolveReturnLines(order.items, dto.items);

      const productIds = [...new Set(order.items.map((item) => item.productId))];
      const products = await this.returns.findProductsOnSale(productIds, tx);
      if (returnType === ReturnType.RETURN && products.some((product) => product.onSale)) {
        throw new BadRequestException('Sale items are exchange only');
      }

      const created = await this.returns.create(
        {
          order: { connect: { id: order.id } },
          user: { connect: { id: userId } },
          type: returnType,
          reason: dto.reason.trim(),
          items: {
            create: lines.map((line) => ({
              orderItemId: line.orderItemId,
              variantId: line.variantId,
              quantity: line.quantity,
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

  async listAdmin(query: ListReturnsQueryDto) {
    const rows = await this.returns.listAdmin(query);
    return this.toCursorPage(rows, query.limit, toDetailResponse);
  }

  async getAdmin(id: string): Promise<ReturnDetailResponseDto> {
    const row = await this.returns.findById(id);
    if (!row) throw new NotFoundException('Return request not found');
    return toDetailResponse(row);
  }

  async approve(actor: JwtPayload, id: string, dto: AdminReturnActionDto) {
    return this.transition(actor, id, ReturnStatus.APPROVED, dto.note, { decidedAt: new Date() });
  }

  async reject(actor: JwtPayload, id: string, dto: AdminReturnActionDto) {
    return this.transition(actor, id, ReturnStatus.REJECTED, dto.note, { decidedAt: new Date() });
  }

  async complete(actor: JwtPayload, id: string, dto: AdminReturnActionDto) {
    return this.returns.runTransaction(async (tx) => {
      const current = await tx.returnRequest.findUnique({
        where: { id },
        include: {
          order: { select: { id: true, number: true, userId: true, status: true, deliveredAt: true } },
          items: { select: { id: true, orderItemId: true, variantId: true, quantity: true } },
        },
      });
      if (!current) throw new NotFoundException('Return request not found');

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

      const updated = await this.returns.updateStatus(
        id,
        {
          status: ReturnStatus.COMPLETED,
          completedAt: new Date(),
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

      if (current.type === ReturnType.RETURN) {
        await this.returns.markOrderReturned(current.orderId, tx);
      }

      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: 'return.complete',
          resourceType: 'return_request',
          resourceId: id,
          before: { status: current.status },
          after: { status: ReturnStatus.COMPLETED, orderId: current.orderId },
        },
        tx,
      );

      return toDetailResponse(updated);
    });
  }

  private async transition(
    actor: JwtPayload,
    id: string,
    status: ReturnStatus,
    note: string | undefined,
    extra: { decidedAt: Date },
  ): Promise<ReturnDetailResponseDto> {
    return this.returns.runTransaction(async (tx) => {
      const current = await tx.returnRequest.findUnique({
        where: { id },
        include: {
          order: { select: { id: true, number: true, userId: true, status: true, deliveredAt: true } },
          items: { select: { id: true, orderItemId: true, variantId: true, quantity: true } },
        },
      });
      if (!current) throw new NotFoundException('Return request not found');

      if (current.status !== ReturnStatus.PENDING) {
        throw new BadRequestException(`Cannot ${status.toLowerCase()} a ${current.status.toLowerCase()} return`);
      }

      const updated = await this.returns.updateStatus(
        id,
        { status, ...extra },
        tx,
      );

      await this.returns.appendStatusHistory(
        {
          returnRequestId: id,
          status,
          note: note?.trim() || null,
          actorId: actor.sub,
        },
        tx,
      );

      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: status === ReturnStatus.APPROVED ? 'return.approve' : 'return.reject',
          resourceType: 'return_request',
          resourceId: id,
          before: { status: current.status },
          after: { status, note: note ?? null },
        },
        tx,
      );

      return toDetailResponse(updated);
    });
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

  private resolveReturnLines(
    orderItems: Array<{
      id: string;
      variantId: string;
      quantity: number;
    }>,
    requested?: CreateReturnDto['items'],
  ): Array<{ orderItemId: string; variantId: string; quantity: number }> {
    if (!requested || requested.length === 0) {
      return orderItems.map((item) => ({
        orderItemId: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
      }));
    }

    const byId = new Map(orderItems.map((item) => [item.id, item]));
    const lines: Array<{ orderItemId: string; variantId: string; quantity: number }> = [];

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
        variantId: orderItem.variantId,
        quantity: line.quantity,
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
        nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
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
    })),
  };
}

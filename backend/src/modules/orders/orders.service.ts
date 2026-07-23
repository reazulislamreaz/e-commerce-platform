import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  NotificationType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ReservationStatus,
} from '@/generated/prisma/client';
import { normalizeBdPhone } from '@/common/utils/bd-phone';
import { generateOrderNumber } from '@/common/utils/hash';
import { USER_FACING } from '@/common/messages/user-facing-errors';
import { poishaToTaka, STANDARD_SHIPPING_POISHA } from '@/common/utils/money';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { CartService } from '@/modules/cart/cart.service';
import { CustomerMetricsService } from '@/modules/crm/customer-metrics.service';
import { DeliveryPartnersService } from '@/modules/delivery-partners/delivery-partners.service';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { AuditService } from '@/modules/platform/audit.service';
import { IdempotencyService } from '@/modules/platform/idempotency.service';
import { OUTBOX_EVENT, OutboxService } from '@/modules/platform/outbox.service';
import { PromotionsService } from '@/modules/promotions/promotions.service';
import { PrismaService } from '@/prisma/prisma.service';
import type { AdminCancelOrderDto } from './dto/admin-cancel-order.dto';
import { AdminListOrdersQueryDto, AdminOrderSort } from './dto/admin-list-orders.query.dto';
import type { AdminSetTrackingDto } from './dto/admin-set-tracking.dto';
import type { AdminUpdateOrderStatusDto } from './dto/admin-update-order-status.dto';
import {
  BulkOrderAction,
  type BulkOrdersDto,
  type UpdateOrderNotesDto,
} from './dto/bulk-orders.dto';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { ListOrdersQueryDto } from './dto/list-orders.query.dto';
import type { OrderResponseDto, OrdersSummaryDto } from './dto/order-response.dto';
import type { TrackOrderQueryDto } from './dto/track-order.query.dto';
import { InvoicePdfService } from './invoice-pdf.service';
import {
  OrdersRepository,
  type CheckoutVariantRecord,
  type OrderDetailRecord,
} from './orders.repository';

export type InvoiceFile = { buffer: Buffer; fileName: string };

const IDEMPOTENCY_SCOPE_CREATE = 'orders:create';
const TERMINAL_STATUSES = new Set<OrderStatus>([
  OrderStatus.CANCELLED,
  OrderStatus.DELIVERED,
  OrderStatus.RETURNED,
  OrderStatus.EXCHANGED,
]);
const PRE_SHIP_STATUSES = new Set<OrderStatus>([
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.PACKED,
]);

export { PRE_SHIP_STATUSES };

/** Default COD reservation hold; release worker can reclaim expired ACTIVE holds. */
const RESERVATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const FULFILLMENT_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  [OrderStatus.PACKED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
};

export type CheckoutTotals = {
  subtotalPoisha: bigint;
  discountPoisha: bigint;
  shippingPoisha: bigint;
  totalPoisha: bigint;
  shippingWaived: boolean;
};

export type CreateOrderResult =
  | { kind: 'created'; order: OrderResponseDto }
  | { kind: 'replay'; statusCode: number; body: OrderResponseDto };

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersRepository,
    private readonly cart: CartService,
    private readonly inventory: InventoryService,
    private readonly promotions: PromotionsService,
    private readonly idempotency: IdempotencyService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly customerMetrics: CustomerMetricsService,
    private readonly deliveryPartners: DeliveryPartnersService,
    private readonly invoicePdf: InvoicePdfService,
  ) {}

  computeCheckoutTotals(input: {
    subtotalPoisha: bigint;
    discountPoisha: bigint;
    shippingWaived: boolean;
  }): CheckoutTotals {
    const shippingPoisha =
      input.subtotalPoisha > 0n ? (input.shippingWaived ? 0n : STANDARD_SHIPPING_POISHA) : 0n;
    const discountPoisha = input.discountPoisha;
    const totalPoisha = input.subtotalPoisha - discountPoisha + shippingPoisha;

    return {
      subtotalPoisha: input.subtotalPoisha,
      discountPoisha,
      shippingPoisha,
      totalPoisha,
      shippingWaived: input.shippingWaived,
    };
  }

  assertFulfillmentTransition(from: OrderStatus, to: OrderStatus): void {
    if (from === to) {
      throw new BadRequestException(`Order is already ${mapStatusToApi(from)}`);
    }
    if (TERMINAL_STATUSES.has(from)) {
      throw new BadRequestException(
        `Cannot transition from terminal status ${mapStatusToApi(from)}`,
      );
    }
    const allowed = FULFILLMENT_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Invalid status transition from ${mapStatusToApi(from)} to ${mapStatusToApi(to)}`,
      );
    }
  }

  async createOrder(
    dto: CreateOrderDto,
    idempotencyKey: string,
    user: JwtPayload | undefined,
    guestToken: string | undefined,
  ): Promise<CreateOrderResult> {
    const userId = user?.sub ?? null;

    const lines = await this.cart.resolveCheckoutLines(userId, guestToken, dto.items);
    const variantIds = lines.map((line) => line.variantId);
    const variants = await this.orders.findActiveVariantsByIds(variantIds);
    const variantById = new Map(variants.map((variant) => [variant.id, variant]));

    if (variants.length !== new Set(variantIds).size) {
      throw new BadRequestException(USER_FACING.ITEMS_UNAVAILABLE);
    }

    const pricedLines = lines.map((line) => {
      const variant = variantById.get(line.variantId);
      if (!variant) throw new BadRequestException(USER_FACING.ITEMS_UNAVAILABLE);
      return { variant, quantity: line.quantity };
    });

    const subtotalPoisha = pricedLines.reduce(
      (sum, line) => sum + line.variant.product.currentPriceAmount * BigInt(line.quantity),
      0n,
    );

    if (dto.couponCode && !userId) {
      throw new BadRequestException(USER_FACING.COUPON_REQUIRES_LOGIN);
    }

    const phone = normalizeBdPhone(dto.phone) ?? dto.phone.trim();
    const email = dto.email.trim().toLowerCase();

    return this.prisma.$transaction(async (tx) => {
      const claim = await this.idempotency.claim(IDEMPOTENCY_SCOPE_CREATE, idempotencyKey, dto, tx);
      if (claim.kind === 'replay') {
        return {
          kind: 'replay' as const,
          statusCode: claim.responseCode,
          body: claim.responseBody as OrderResponseDto,
        };
      }

      let discountPoisha = 0n;
      let shippingWaived = false;
      let couponId: string | null = null;
      let normalizedCouponCode: string | undefined;

      if (dto.couponCode && userId) {
        const quote = await this.promotions.quoteCouponLocked(
          dto.couponCode,
          subtotalPoisha,
          userId,
          tx,
        );
        discountPoisha = quote.discountPoisha;
        shippingWaived = quote.shippingWaived;
        couponId = quote.couponId;
        normalizedCouponCode = quote.code;
      }

      const totals = this.computeCheckoutTotals({
        subtotalPoisha,
        discountPoisha,
        shippingWaived,
      });

      const orderId = await this.createOrderRecord(
        tx,
        {
          userId,
          email,
          phone,
          notes: dto.notes?.trim() || null,
          totals,
          couponCode: normalizedCouponCode,
        },
        pricedLines,
        dto,
        phone,
      );

      await this.inventory.reserveForOrder(
        orderId,
        pricedLines.map((line) => ({
          variantId: line.variant.id,
          quantity: line.quantity,
        })),
        tx,
        new Date(Date.now() + RESERVATION_TTL_MS),
      );

      if (couponId && normalizedCouponCode && userId) {
        await this.promotions.redeemCoupon(
          {
            couponId,
            userId,
            orderId,
            discountPoisha: totals.discountPoisha,
            shippingWaived: totals.shippingWaived,
          },
          tx,
        );
      }

      await this.cart.clearAfterCheckout(userId, guestToken, tx);

      const created = await tx.customerOrder.findUniqueOrThrow({
        where: { id: orderId },
        include: this.orders.detailInclude,
      });

      const mapped = this.toOrderResponse(created);

      const emailProfile = userId
        ? await tx.user.findUnique({
            where: { id: userId },
            select: {
              firstName: true,
              preference: { select: { emailOrderUpdates: true } },
            },
          })
        : null;
      const emailOrderUpdates = emailProfile?.preference?.emailOrderUpdates !== false;

      if (emailOrderUpdates) {
        await this.outbox.enqueue(
          OUTBOX_EVENT.ORDER_CONFIRMATION_EMAIL,
          orderId,
          {
            orderId,
            orderNumber: created.number,
            email: created.email,
            firstName: emailProfile?.firstName ?? '',
            totalTaka: poishaToTaka(created.totalPoisha),
            items: created.items.map((item) => ({
              name: item.name,
              size: item.size,
              color: item.color,
              quantity: item.quantity,
              unitPriceTaka: poishaToTaka(item.unitPricePoisha),
            })),
            subtotalTaka: poishaToTaka(created.subtotalPoisha),
            shippingTaka: poishaToTaka(created.shippingPoisha),
            discountTaka: poishaToTaka(created.discountPoisha),
          },
          tx,
        );
      }

      if (userId) {
        const notification = await this.notifications.createForUser(
          {
            userId,
            type: NotificationType.ORDER_STATUS,
            title: 'Order confirmed',
            body: `Your order ${created.number} has been confirmed.`,
            href: `/account/orders/${orderId}`,
            dedupeKey: `order:${orderId}:confirmed`,
            payload: { orderId, status: OrderStatus.CONFIRMED },
          },
          tx,
        );
        if (notification && emailOrderUpdates) {
          await this.notifications.createEmailDelivery(notification.id, tx);
        }
        await this.customerMetrics.recordActivity(
          userId,
          'ORDER_CREATED',
          `Order ${created.number} placed`,
          `/account/orders/${orderId}`,
          { orderId, orderNumber: created.number, totalPoisha: created.totalPoisha.toString() },
          tx,
        );
        await this.customerMetrics.recomputeForUser(userId, tx);
      }

      await this.idempotency.saveResponse(
        IDEMPOTENCY_SCOPE_CREATE,
        idempotencyKey,
        201,
        mapped,
        tx,
      );

      return { kind: 'created' as const, order: mapped };
    });
  }

  async listMine(userId: string, query: ListOrdersQueryDto) {
    const rows = await this.orders.listByUserId(userId, query);
    return this.toCursorPage(rows, query.limit);
  }

  async getMine(userId: string, orderId: string): Promise<OrderResponseDto> {
    const order = await this.orders.findById(orderId);
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }
    return this.toOrderResponse(order);
  }

  async track(query: TrackOrderQueryDto): Promise<OrderResponseDto> {
    const order = await this.orders.findByNumberAndEmail(query.number, query.email);
    if (!order) throw new NotFoundException('Order not found');
    return this.toOrderResponse(order);
  }

  /** Authorized invoice for an owned order (ownership enforced by getMine). */
  async getMineInvoice(userId: string, orderId: string): Promise<InvoiceFile> {
    const order = await this.getMine(userId, orderId);
    return this.renderInvoice(order);
  }

  /** Guest invoice via order number + email (same security model as track). */
  async getTrackedInvoice(query: TrackOrderQueryDto): Promise<InvoiceFile> {
    const order = await this.track(query);
    return this.renderInvoice(order);
  }

  private async renderInvoice(order: OrderResponseDto): Promise<InvoiceFile> {
    const buffer = await this.invoicePdf.generate(order);
    return { buffer, fileName: `invoice-${order.number}.pdf` };
  }

  async listAdmin(query: ListOrdersQueryDto) {
    const rows = await this.orders.listAdmin(query);
    return this.toCursorPage(rows, query.limit);
  }

  async listAdminOffset(query: AdminListOrdersQueryDto) {
    const pageSize = query.pageSize ?? query.limit;
    const page = query.page;
    const where = this.buildAdminListWhere(query);
    const orderBy = this.buildAdminListOrderBy(query.sort);

    const [total, rows] = await Promise.all([
      this.orders.countAdmin(where),
      this.orders.listAdminOffset({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      data: rows.map((order) => this.toOrderResponse(order)),
      meta: {
        page,
        pageSize,
        limit: pageSize,
        total,
        totalPages,
        nextCursor: null as string | null,
      },
    };
  }

  async getSummary(): Promise<OrdersSummaryDto> {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

    const [statusGroups, today, thisWeek, thisMonth, revenue] = await Promise.all([
      this.orders.groupStatusCounts(),
      this.orders.countCreatedSince(startOfToday),
      this.orders.countCreatedSince(startOfWeek),
      this.orders.countCreatedSince(startOfMonth),
      this.orders.aggregatedCollectedRevenue(),
    ]);

    const byStatus = Object.fromEntries(
      statusGroups.map((row) => [row.status, row._count._all]),
    ) as Partial<Record<OrderStatus, number>>;

    const totalOrders = statusGroups.reduce((sum, row) => sum + row._count._all, 0);
    const totalRevenuePoisha = revenue._sum.amountPoisha ?? 0n;
    const avgPoisha = revenue._avg.amountPoisha
      ? BigInt(Math.round(Number(revenue._avg.amountPoisha)))
      : 0n;

    return {
      totalOrders,
      pending: byStatus[OrderStatus.PENDING] ?? 0,
      confirmed: byStatus[OrderStatus.CONFIRMED] ?? 0,
      processing: byStatus[OrderStatus.PROCESSING] ?? 0,
      packed: byStatus[OrderStatus.PACKED] ?? 0,
      shipped: byStatus[OrderStatus.SHIPPED] ?? 0,
      delivered: byStatus[OrderStatus.DELIVERED] ?? 0,
      cancelled: byStatus[OrderStatus.CANCELLED] ?? 0,
      returned: byStatus[OrderStatus.RETURNED] ?? 0,
      exchanged: byStatus[OrderStatus.EXCHANGED] ?? 0,
      today,
      thisWeek,
      thisMonth,
      totalRevenue: poishaToTaka(totalRevenuePoisha),
      averageOrderValue: poishaToTaka(avgPoisha),
    };
  }

  async getAdmin(orderId: string): Promise<OrderResponseDto> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    return this.toOrderResponse(order);
  }

  async updateNotes(
    actor: JwtPayload,
    orderId: string,
    dto: UpdateOrderNotesDto,
  ): Promise<OrderResponseDto> {
    const existing = await this.orders.findById(orderId);
    if (!existing) throw new NotFoundException('Order not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.customerOrder.update({
        where: { id: orderId },
        data: { notes: dto.notes?.trim() ? dto.notes.trim() : null },
      });
      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: 'order.notes.update',
          resourceType: 'order',
          resourceId: orderId,
          before: { notes: existing.notes },
          after: { notes: dto.notes?.trim() || null },
        },
        tx,
      );
    });

    return this.getAdmin(orderId);
  }

  async bulk(actor: JwtPayload, dto: BulkOrdersDto) {
    if (dto.action === BulkOrderAction.EXPORT) {
      const orders = await this.prisma.customerOrder.findMany({
        where: { id: { in: dto.ids } },
        include: this.orders.detailInclude,
        orderBy: { createdAt: 'desc' },
      });
      const csv = this.toOrdersCsv(orders.map((order) => this.toOrderResponse(order)));
      return {
        processed: orders.length,
        succeeded: orders.map((o) => o.id),
        failed: [] as Array<{ id: string; reason: string }>,
        csv,
      };
    }

    const targetStatus = this.bulkActionToStatus(dto.action);
    const succeeded: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of dto.ids) {
      try {
        await this.updateStatus(actor, id, {
          status: targetStatus,
          note: dto.note,
          trackingNumber: dto.trackingNumber,
          deliveryPartnerId: dto.deliveryPartnerId,
          trackingUrl: dto.trackingUrl,
          shippingNote: dto.shippingNote,
        });
        succeeded.push(id);
      } catch (error) {
        failed.push({
          id,
          reason: error instanceof Error ? error.message : 'Failed to update order',
        });
      }
    }

    return {
      processed: succeeded.length,
      succeeded,
      failed,
    };
  }

  private bulkActionToStatus(action: BulkOrderAction): OrderStatus {
    switch (action) {
      case BulkOrderAction.CONFIRM:
        return OrderStatus.CONFIRMED;
      case BulkOrderAction.START_PROCESSING:
        return OrderStatus.PROCESSING;
      case BulkOrderAction.MARK_PACKED:
        return OrderStatus.PACKED;
      case BulkOrderAction.SHIP:
        return OrderStatus.SHIPPED;
      case BulkOrderAction.CANCEL:
        return OrderStatus.CANCELLED;
      default:
        throw new BadRequestException('Unsupported bulk action');
    }
  }

  private buildAdminListWhere(query: AdminListOrdersQueryDto): Prisma.CustomerOrderWhereInput {
    const search = query.search?.trim();
    const createdAt: Prisma.DateTimeFilter | undefined =
      query.createdFrom || query.createdTo
        ? {
            ...(query.createdFrom ? { gte: new Date(query.createdFrom) } : {}),
            ...(query.createdTo
              ? {
                  lte: (() => {
                    const end = new Date(query.createdTo);
                    if (!query.createdTo.includes('T')) {
                      end.setHours(23, 59, 59, 999);
                    }
                    return end;
                  })(),
                }
              : {}),
          }
        : undefined;

    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.number ? { number: { contains: query.number, mode: 'insensitive' } } : {}),
      ...(query.email ? { email: { contains: query.email, mode: 'insensitive' } } : {}),
      ...(query.phone ? { phone: { contains: query.phone, mode: 'insensitive' } } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...(query.paymentStatus ? { payment: { status: query.paymentStatus } } : {}),
      ...(query.deliveryPartnerId
        ? { shipments: { some: { deliveryPartnerId: query.deliveryPartnerId } } }
        : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { address: { fullName: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
  }

  private buildAdminListOrderBy(
    sort: AdminOrderSort,
  ): Prisma.CustomerOrderOrderByWithRelationInput[] {
    switch (sort) {
      case AdminOrderSort.CREATED_ASC:
        return [{ createdAt: 'asc' }, { id: 'asc' }];
      case AdminOrderSort.TOTAL_DESC:
        return [{ totalPoisha: 'desc' }, { createdAt: 'desc' }];
      case AdminOrderSort.TOTAL_ASC:
        return [{ totalPoisha: 'asc' }, { createdAt: 'desc' }];
      case AdminOrderSort.UPDATED_DESC:
        return [{ updatedAt: 'desc' }, { id: 'desc' }];
      case AdminOrderSort.CREATED_DESC:
      default:
        return [{ createdAt: 'desc' }, { id: 'desc' }];
    }
  }

  private toOrdersCsv(orders: OrderResponseDto[]): string {
    const header = [
      'Order Number',
      'Status',
      'Customer',
      'Email',
      'Phone',
      'Total',
      'Payment Status',
      'Delivery Partner',
      'Tracking',
      'Created At',
    ];
    const lines = orders.map((order) =>
      [
        order.number,
        order.status,
        order.customerName ?? '',
        order.email ?? '',
        order.phone ?? '',
        String(order.total),
        order.paymentStatus ?? '',
        order.shipment?.deliveryPartnerName ?? order.shipment?.carrier ?? '',
        order.trackingNumber ?? '',
        order.createdAt,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    );
    return [header.join(','), ...lines].join('\n');
  }

  async updateStatus(
    actor: JwtPayload,
    orderId: string,
    dto: AdminUpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        Array<{
          id: string;
          number: string;
          email: string;
          userId: string | null;
          status: OrderStatus;
          version: number;
        }>
      >`
        SELECT id, number, email, "userId", status, version
        FROM customer_order
        WHERE id = ${orderId}::uuid
        FOR UPDATE
      `;
      const orderRow = locked[0];
      if (!orderRow) throw new NotFoundException('Order not found');

      const order = await tx.customerOrder.findUniqueOrThrow({
        where: { id: orderId },
        include: {
          payment: true,
          shipments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });

      // Idempotent no-op when already at the requested status.
      if (order.status === dto.status) {
        return this.toOrderResponse(
          await tx.customerOrder.findUniqueOrThrow({
            where: { id: order.id },
            include: this.orders.detailInclude,
          }),
        );
      }

      this.assertFulfillmentTransition(order.status, dto.status);

      const now = new Date();
      const statusData: Prisma.CustomerOrderUpdateInput = {
        status: dto.status,
        version: { increment: 1 },
      };

      if (dto.status === OrderStatus.CONFIRMED) {
        statusData.confirmedAt = now;
      } else if (dto.status === OrderStatus.PROCESSING) {
        statusData.processingAt = now;
      } else if (dto.status === OrderStatus.PACKED) {
        statusData.packedAt = now;
      } else if (dto.status === OrderStatus.SHIPPED) {
        await this.ensureShipmentForShip(tx, order.id, order.shipments[0] ?? null, dto, actor.sub);
        await this.inventory.consumeForShipment(order.id, tx);
        statusData.shippedAt = now;
      } else if (dto.status === OrderStatus.CANCELLED) {
        if (PRE_SHIP_STATUSES.has(order.status)) {
          await this.inventory.releaseForOrder(order.id, tx);
          if (order.payment) {
            await tx.payment.update({
              where: { id: order.payment.id },
              data: { status: PaymentStatus.CANCELLED },
            });
          }
        }
        statusData.cancelledAt = now;
      } else if (dto.status === OrderStatus.DELIVERED) {
        statusData.deliveredAt = now;
        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: { status: PaymentStatus.COLLECTED, collectedAt: now },
          });
        }
      }

      await tx.customerOrder.update({
        where: { id: order.id },
        data: statusData,
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: dto.status,
          note: dto.note?.trim() || null,
          actorId: actor.sub,
        },
      });

      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: 'order.status.update',
          resourceType: 'order',
          resourceId: order.id,
          before: { status: order.status, version: orderRow.version },
          after: { status: dto.status, note: dto.note ?? null },
        },
        tx,
      );

      const trackingNumber =
        dto.trackingNumber?.trim() || order.shipments[0]?.trackingNumber || null;

      if (dto.status === OrderStatus.CANCELLED && order.couponCode) {
        // Free the redemption slot so the customer can reuse the coupon.
        await this.promotions.voidRedemptionForOrder(order.id, tx);
      }

      const emailProfile = order.userId
        ? await tx.user.findUnique({
            where: { id: order.userId },
            select: {
              firstName: true,
              preference: { select: { emailOrderUpdates: true } },
            },
          })
        : null;
      const emailOrderUpdates = emailProfile?.preference?.emailOrderUpdates !== false;
      const firstName = emailProfile?.firstName ?? '';
      const orderUrl = order.userId
        ? `/account/orders/${order.id}`
        : `/track-order?number=${encodeURIComponent(order.number)}`;

      if (emailOrderUpdates) {
        if (dto.status === OrderStatus.SHIPPED && trackingNumber) {
          await this.outbox.enqueue(
            OUTBOX_EVENT.SHIPPING_UPDATE_EMAIL,
            order.id,
            {
              orderId: order.id,
              orderNumber: order.number,
              to: order.email,
              firstName,
              status: mapStatusToApi(dto.status),
              trackingNumber,
              carrier: dto.carrier?.trim() || order.shipments[0]?.carrier || undefined,
              orderUrl,
            },
            tx,
          );
        } else if (dto.status === OrderStatus.DELIVERED) {
          await this.outbox.enqueue(
            OUTBOX_EVENT.DELIVERED_EMAIL,
            order.id,
            {
              orderId: order.id,
              orderNumber: order.number,
              to: order.email,
              firstName,
              orderUrl,
            },
            tx,
          );
          if (order.payment) {
            // COD is collected on delivery, so payment confirmation rides the same transition.
            await this.outbox.enqueue(
              OUTBOX_EVENT.PAYMENT_CONFIRMATION_EMAIL,
              order.id,
              {
                orderId: order.id,
                orderNumber: order.number,
                to: order.email,
                firstName,
                totalTaka: poishaToTaka(order.payment.amountPoisha),
                paymentMethod: 'Cash on Delivery',
                orderUrl,
              },
              tx,
            );
          }
        } else {
          await this.outbox.enqueue(
            OUTBOX_EVENT.ORDER_STATUS_EMAIL,
            order.id,
            {
              orderId: order.id,
              orderNumber: order.number,
              email: order.email,
              firstName,
              status: mapStatusToApi(dto.status),
              note: dto.note?.trim() || null,
              trackingNumber,
            },
            tx,
          );
        }
      }

      if (order.userId) {
        const statusLabel = mapStatusToApi(dto.status);
        const notificationType =
          dto.status === OrderStatus.SHIPPED
            ? NotificationType.SHIPPING
            : dto.status === OrderStatus.DELIVERED
              ? NotificationType.DELIVERY
              : NotificationType.ORDER_STATUS;
        const notification = await this.notifications.createForUser(
          {
            userId: order.userId,
            type: notificationType,
            title: `Order ${statusLabel}`,
            body: `Your order ${order.number} is now ${statusLabel}.`,
            href: `/account/orders/${order.id}`,
            dedupeKey: `order:${order.id}:${dto.status}`,
            payload: { orderId: order.id, status: dto.status },
          },
          tx,
        );
        if (notification && emailOrderUpdates) {
          await this.notifications.createEmailDelivery(notification.id, tx);
        }

        if (dto.status === OrderStatus.DELIVERED) {
          const paymentNotification = await this.notifications.createForUser(
            {
              userId: order.userId,
              type: NotificationType.PAYMENT,
              title: 'Payment collected',
              body: `COD payment for order ${order.number} was collected on delivery.`,
              href: `/account/orders/${order.id}`,
              dedupeKey: `order:${order.id}:payment:collected`,
              payload: { orderId: order.id, paymentStatus: PaymentStatus.COLLECTED },
            },
            tx,
          );
          if (paymentNotification && emailOrderUpdates) {
            await this.notifications.createEmailDelivery(paymentNotification.id, tx);
          }
        }

        await this.customerMetrics.recordActivity(
          order.userId,
          'ORDER_STATUS_CHANGED',
          `Order ${order.number} ${statusLabel}`,
          `/account/orders/${order.id}`,
          { orderId: order.id, status: dto.status },
          tx,
        );
        await this.customerMetrics.recomputeForUser(order.userId, tx);
      }

      const updated = await tx.customerOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: this.orders.detailInclude,
      });

      return this.toOrderResponse(updated);
    });
  }

  async setTracking(
    actor: JwtPayload,
    orderId: string,
    dto: AdminSetTrackingDto,
  ): Promise<OrderResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.customerOrder.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('Order not found');

      await this.createOrUpdateShipment(tx, order.id, {
        trackingNumber: dto.trackingNumber,
        carrier: dto.carrier,
        deliveryPartnerId: dto.deliveryPartnerId,
        trackingUrl: dto.trackingUrl,
        shippingNote: dto.shippingNote,
        estimatedDeliveryAt: dto.estimatedDeliveryAt,
        assignedById: actor.sub,
      });

      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: 'order.tracking.set',
          resourceType: 'order',
          resourceId: order.id,
          after: {
            trackingNumber: dto.trackingNumber,
            carrier: dto.carrier ?? null,
            deliveryPartnerId: dto.deliveryPartnerId ?? null,
          },
        },
        tx,
      );

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          note: dto.shippingNote?.trim() || 'Tracking updated',
          actorId: actor.sub,
        },
      });

      const updated = await tx.customerOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: this.orders.detailInclude,
      });

      return this.toOrderResponse(updated);
    });
  }

  async cancel(
    actor: JwtPayload,
    orderId: string,
    dto: AdminCancelOrderDto,
  ): Promise<OrderResponseDto> {
    return this.updateStatus(actor, orderId, {
      status: OrderStatus.CANCELLED,
      note: dto.reason,
    });
  }

  /**
   * Atomically releases expired ACTIVE holds and cancels still pre-ship orders so
   * fulfillment cannot proceed after inventory was silently reclaimed.
   */
  async releaseExpiredReservationHolds(limit = 50): Promise<number> {
    const expired = await this.prisma.inventoryReservation.findMany({
      where: {
        status: ReservationStatus.ACTIVE,
        expiresAt: { lte: new Date() },
      },
      select: { orderId: true },
      take: limit,
      orderBy: { expiresAt: 'asc' },
    });

    let released = 0;
    for (const row of expired) {
      try {
        const didRelease = await this.prisma.$transaction(async (tx) => {
          const reservation = await tx.inventoryReservation.findUnique({
            where: { orderId: row.orderId },
          });
          if (
            !reservation ||
            reservation.status !== ReservationStatus.ACTIVE ||
            !reservation.expiresAt ||
            reservation.expiresAt > new Date()
          ) {
            return false;
          }

          const order = await tx.customerOrder.findUnique({
            where: { id: row.orderId },
            include: { payment: true },
          });
          if (!order) return false;

          await this.inventory.releaseForOrder(row.orderId, tx);

          if (PRE_SHIP_STATUSES.has(order.status)) {
            const now = new Date();
            await tx.customerOrder.update({
              where: { id: order.id },
              data: {
                status: OrderStatus.CANCELLED,
                cancelledAt: now,
                version: { increment: 1 },
              },
            });
            await tx.orderStatusHistory.create({
              data: {
                orderId: order.id,
                status: OrderStatus.CANCELLED,
                note: 'Inventory hold expired',
              },
            });
            if (order.payment) {
              await tx.payment.update({
                where: { id: order.payment.id },
                data: { status: PaymentStatus.CANCELLED },
              });
            }
            if (order.couponCode) {
              await this.promotions.voidRedemptionForOrder(order.id, tx);
            }
          }

          return true;
        });
        if (didRelease) released += 1;
      } catch (error: unknown) {
        this.logger.warn(
          { err: error, orderId: row.orderId },
          'Failed to release expired reservation',
        );
      }
    }

    return released;
  }

  private async createOrderRecord(
    tx: Prisma.TransactionClient,
    header: {
      userId: string | null;
      email: string;
      phone: string;
      notes: string | null;
      totals: CheckoutTotals;
      couponCode?: string;
    },
    pricedLines: Array<{ variant: CheckoutVariantRecord; quantity: number }>,
    dto: CreateOrderDto,
    phone: string,
  ): Promise<string> {
    const now = new Date();
    const orderNumber = await this.generateUniqueOrderNumber(tx);

    const order = await tx.customerOrder.create({
      data: {
        number: orderNumber,
        userId: header.userId,
        email: header.email,
        phone: header.phone,
        notes: header.notes,
        status: OrderStatus.CONFIRMED,
        subtotalPoisha: header.totals.subtotalPoisha,
        shippingPoisha: header.totals.shippingPoisha,
        discountPoisha: header.totals.discountPoisha,
        totalPoisha: header.totals.totalPoisha,
        couponCode: header.couponCode,
        paymentMethod: PaymentMethod.COD,
        confirmedAt: now,
        address: {
          create: {
            fullName: dto.fullName.trim(),
            phone,
            line1: dto.line1.trim(),
            line2: dto.line2?.trim() || null,
            city: dto.city.trim(),
            district: dto.district.trim(),
            postalCode: dto.postalCode.trim(),
          },
        },
        items: {
          create: pricedLines.map(({ variant, quantity }) => ({
            productId: variant.productId,
            variantId: variant.id,
            name: variant.product.name,
            slug: variant.product.slug,
            image: variant.product.media[0]?.url ?? '',
            size: variant.size,
            color: variant.color,
            quantity,
            unitPricePoisha: variant.product.currentPriceAmount,
          })),
        },
        statusHistory: {
          create: {
            status: OrderStatus.CONFIRMED,
            note: 'Order confirmed',
          },
        },
        payment: {
          create: {
            method: PaymentMethod.COD,
            status: PaymentStatus.PENDING,
            amountPoisha: header.totals.totalPoisha,
          },
        },
      },
      select: { id: true },
    });

    return order.id;
  }

  private async generateUniqueOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const number = generateOrderNumber();
      const existing = await tx.customerOrder.findUnique({
        where: { number },
        select: { id: true },
      });
      if (!existing) return number;
    }
    throw new BadRequestException('Could not allocate an order number; please retry');
  }

  private async ensureShipmentForShip(
    tx: Prisma.TransactionClient,
    orderId: string,
    existingShipment: { id: string; trackingNumber: string } | null,
    dto: Pick<
      AdminUpdateOrderStatusDto,
      | 'trackingNumber'
      | 'carrier'
      | 'deliveryPartnerId'
      | 'trackingUrl'
      | 'shippingNote'
      | 'estimatedDeliveryAt'
    >,
    assignedById: string,
  ): Promise<void> {
    const trackingNumber = dto.trackingNumber?.trim() || existingShipment?.trackingNumber;
    if (!trackingNumber) {
      throw new BadRequestException(
        'Tracking number is required before marking the order as shipped',
      );
    }
    await this.createOrUpdateShipment(tx, orderId, {
      trackingNumber,
      carrier: dto.carrier,
      deliveryPartnerId: dto.deliveryPartnerId,
      trackingUrl: dto.trackingUrl,
      shippingNote: dto.shippingNote,
      estimatedDeliveryAt: dto.estimatedDeliveryAt,
      assignedById,
    });
  }

  private async createOrUpdateShipment(
    tx: Prisma.TransactionClient,
    orderId: string,
    input: {
      trackingNumber: string;
      carrier?: string;
      deliveryPartnerId?: string;
      trackingUrl?: string;
      shippingNote?: string;
      estimatedDeliveryAt?: string;
      assignedById?: string;
    },
  ): Promise<void> {
    const normalizedTracking = input.trackingNumber.trim();
    let carrier = input.carrier?.trim() || null;
    let trackingUrl = input.trackingUrl?.trim() || null;
    const deliveryPartnerId = input.deliveryPartnerId ?? null;

    if (deliveryPartnerId) {
      const partner = await tx.deliveryPartner.findFirst({
        where: { id: deliveryPartnerId, isActive: true },
      });
      if (!partner) {
        throw new BadRequestException('Delivery partner not found or inactive');
      }
      carrier = carrier || partner.companyName;
      trackingUrl =
        this.deliveryPartners.resolveTrackingUrl(
          partner.trackingUrlTemplate,
          normalizedTracking,
          trackingUrl,
        ) ?? trackingUrl;
    } else if (!trackingUrl) {
      trackingUrl = null;
    }

    const existing = await tx.shipment.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    const estimatedDeliveryAt = input.estimatedDeliveryAt
      ? new Date(input.estimatedDeliveryAt)
      : null;
    const assignedAt = deliveryPartnerId || input.assignedById ? new Date() : null;

    const data = {
      trackingNumber: normalizedTracking,
      carrier,
      deliveryPartnerId,
      trackingUrl,
      shippingNote: input.shippingNote?.trim() || null,
      estimatedDeliveryAt,
      ...(input.assignedById
        ? { assignedById: input.assignedById, assignedAt: assignedAt ?? new Date() }
        : {}),
    };

    if (existing) {
      await tx.shipment.update({
        where: { id: existing.id },
        data,
      });
      return;
    }

    await tx.shipment.create({
      data: {
        orderId,
        ...data,
      },
    });
  }

  private toCursorPage(rows: OrderDetailRecord[], limit: number) {
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      data: page.map((order) => this.toOrderResponse(order)),
      meta: {
        limit,
        nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      },
    };
  }

  private actorFullName(
    actor:
      | {
          id: string;
          firstName: string | null;
          lastName: string | null;
        }
      | null
      | undefined,
  ): { id: string; fullName: string } | null {
    if (!actor) return null;
    const fullName = [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim();
    return { id: actor.id, fullName: fullName || 'Staff' };
  }

  private toOrderResponse(order: OrderDetailRecord): OrderResponseDto {
    if (!order.address) {
      throw new BadRequestException(`Order ${order.id} is missing address snapshot`);
    }

    const shipment = order.shipments[0] ?? null;
    const paymentStatus = order.payment?.status ? order.payment.status.toLowerCase() : undefined;

    return {
      id: order.id,
      number: order.number,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      status: mapStatusToApi(order.status),
      items: order.items.map((item) => ({
        orderItemId: item.id,
        variantId: item.variantId,
        productId: item.productId,
        name: item.name,
        slug: item.slug,
        image: item.image,
        sku: item.variant?.sku,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPrice: poishaToTaka(item.unitPricePoisha),
        lineTotal: poishaToTaka(item.unitPricePoisha * BigInt(item.quantity)),
      })),
      subtotal: poishaToTaka(order.subtotalPoisha),
      shipping: poishaToTaka(order.shippingPoisha),
      discount: poishaToTaka(order.discountPoisha),
      total: poishaToTaka(order.totalPoisha),
      couponCode: order.couponCode ?? undefined,
      shippingAddress: {
        id: order.address.id,
        label: 'Shipping',
        fullName: order.address.fullName,
        phone: order.address.phone,
        line1: order.address.line1,
        line2: order.address.line2 ?? undefined,
        city: order.address.city,
        district: order.address.district,
        postalCode: order.address.postalCode,
        country: order.address.country,
        isDefault: false,
        type: 'shipping',
      },
      paymentMethod: 'cod',
      paymentStatus,
      trackingNumber: shipment?.trackingNumber,
      shipment: shipment
        ? {
            deliveryPartnerId: shipment.deliveryPartnerId,
            deliveryPartnerName: shipment.deliveryPartner?.companyName ?? null,
            deliveryPartnerLogoUrl: shipment.deliveryPartner?.logoUrl ?? null,
            carrier: shipment.carrier,
            trackingNumber: shipment.trackingNumber,
            trackingUrl: shipment.trackingUrl,
            shippingNote: shipment.shippingNote,
            shippedAt: shipment.shippedAt.toISOString(),
            assignedAt: shipment.assignedAt?.toISOString() ?? null,
            estimatedDeliveryAt: shipment.estimatedDeliveryAt?.toISOString() ?? null,
            assignedBy: this.actorFullName(shipment.assignedBy),
          }
        : null,
      timeline: buildTimeline(order),
      statusHistory: order.statusHistory.map((entry) => ({
        status: mapStatusToApi(entry.status),
        note: entry.note,
        createdAt: entry.createdAt.toISOString(),
        actor: this.actorFullName(entry.actor),
      })),
      email: order.email,
      phone: order.phone,
      notes: order.notes,
      confirmedAt: order.confirmedAt?.toISOString() ?? null,
      processingAt: order.processingAt?.toISOString() ?? null,
      packedAt: order.packedAt?.toISOString() ?? null,
      shippedAt: order.shippedAt?.toISOString() ?? null,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      cancelledAt: order.cancelledAt?.toISOString() ?? null,
      customerName: order.address.fullName,
      ...(order.userId ? { userId: order.userId } : {}),
    };
  }
}

export function mapStatusToApi(status: OrderStatus): OrderResponseDto['status'] {
  return status.toLowerCase() as OrderResponseDto['status'];
}

export function buildTimeline(order: OrderDetailRecord): OrderResponseDto['timeline'] {
  const reached = new Set(order.statusHistory.map((entry) => entry.status));
  reached.add(order.status);

  const historyAt = (status: OrderStatus): string => {
    const entry = order.statusHistory.find((row) => row.status === status);
    if (entry) return entry.createdAt.toISOString();
    if (status === OrderStatus.CONFIRMED && order.confirmedAt) {
      return order.confirmedAt.toISOString();
    }
    if (status === OrderStatus.PROCESSING && order.processingAt) {
      return order.processingAt.toISOString();
    }
    if (status === OrderStatus.PACKED && order.packedAt) {
      return order.packedAt.toISOString();
    }
    if (status === OrderStatus.SHIPPED && order.shippedAt) {
      return order.shippedAt.toISOString();
    }
    if (status === OrderStatus.DELIVERED && order.deliveredAt) {
      return order.deliveredAt.toISOString();
    }
    return '';
  };

  const stepDone = (statuses: OrderStatus[]): boolean =>
    statuses.some((status) => reached.has(status));

  const fulfillmentTrail = [
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.PACKED,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
    OrderStatus.RETURNED,
    OrderStatus.EXCHANGED,
  ];

  return [
    {
      label: 'Order placed',
      at: order.createdAt.toISOString(),
      done: true,
    },
    {
      label: 'Confirmed',
      at: historyAt(OrderStatus.CONFIRMED),
      done: stepDone(fulfillmentTrail),
    },
    {
      label: 'Processing',
      at: historyAt(OrderStatus.PROCESSING),
      done: stepDone([
        OrderStatus.PROCESSING,
        OrderStatus.PACKED,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
        OrderStatus.RETURNED,
        OrderStatus.EXCHANGED,
      ]),
    },
    {
      label: 'Packed',
      at: historyAt(OrderStatus.PACKED),
      done: stepDone([
        OrderStatus.PACKED,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
        OrderStatus.RETURNED,
        OrderStatus.EXCHANGED,
      ]),
    },
    {
      label: 'Shipped',
      at: historyAt(OrderStatus.SHIPPED),
      done: stepDone([
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
        OrderStatus.RETURNED,
        OrderStatus.EXCHANGED,
      ]),
    },
    {
      label: 'Delivered',
      at: historyAt(OrderStatus.DELIVERED),
      done: stepDone([OrderStatus.DELIVERED, OrderStatus.RETURNED, OrderStatus.EXCHANGED]),
    },
  ];
}

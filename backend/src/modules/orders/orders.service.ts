import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@/generated/prisma/client';
import { normalizeBdPhone } from '@/common/utils/bd-phone';
import { generateOrderNumber } from '@/common/utils/hash';
import { poishaToTaka, STANDARD_SHIPPING_POISHA } from '@/common/utils/money';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { CartService } from '@/modules/cart/cart.service';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { AuditService } from '@/modules/platform/audit.service';
import { IdempotencyService } from '@/modules/platform/idempotency.service';
import { OUTBOX_EVENT, OutboxService } from '@/modules/platform/outbox.service';
import { PromotionsService } from '@/modules/promotions/promotions.service';
import { PrismaService } from '@/prisma/prisma.service';
import type { AdminCancelOrderDto } from './dto/admin-cancel-order.dto';
import type { AdminSetTrackingDto } from './dto/admin-set-tracking.dto';
import type { AdminUpdateOrderStatusDto } from './dto/admin-update-order-status.dto';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { ListOrdersQueryDto } from './dto/list-orders.query.dto';
import type { OrderResponseDto } from './dto/order-response.dto';
import type { TrackOrderQueryDto } from './dto/track-order.query.dto';
import {
  OrdersRepository,
  type CheckoutVariantRecord,
  type OrderDetailRecord,
} from './orders.repository';

const IDEMPOTENCY_SCOPE_CREATE = 'orders:create';
const TERMINAL_STATUSES = new Set<OrderStatus>([
  OrderStatus.CANCELLED,
  OrderStatus.DELIVERED,
  OrderStatus.RETURNED,
]);
const PRE_SHIP_STATUSES = new Set<OrderStatus>([
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
]);

const FULFILLMENT_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
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
  ) {}

  computeCheckoutTotals(input: {
    subtotalPoisha: bigint;
    discountPoisha: bigint;
    shippingWaived: boolean;
  }): CheckoutTotals {
    const shippingPoisha =
      input.subtotalPoisha > 0n
        ? input.shippingWaived
          ? 0n
          : STANDARD_SHIPPING_POISHA
        : 0n;
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
      throw new BadRequestException(`Cannot transition from terminal status ${mapStatusToApi(from)}`);
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
      throw new BadRequestException('One or more items are unavailable');
    }

    const pricedLines = lines.map((line) => {
      const variant = variantById.get(line.variantId);
      if (!variant) throw new BadRequestException('One or more items are unavailable');
      return { variant, quantity: line.quantity };
    });

    const subtotalPoisha = pricedLines.reduce(
      (sum, line) => sum + line.variant.product.currentPriceAmount * BigInt(line.quantity),
      0n,
    );

    if (dto.couponCode && !userId) {
      throw new BadRequestException('Sign in to apply coupons');
    }

    const phone = normalizeBdPhone(dto.phone) ?? dto.phone.trim();
    const email = dto.email.trim().toLowerCase();

    return this.prisma.$transaction(async (tx) => {
      const claim = await this.idempotency.claim(
        IDEMPOTENCY_SCOPE_CREATE,
        idempotencyKey,
        dto,
        tx,
      );
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
        include: {
          address: true,
          items: { orderBy: { createdAt: 'asc' } },
          statusHistory: { orderBy: { createdAt: 'asc' } },
          shipments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });

      const mapped = this.toOrderResponse(created);

      await this.outbox.enqueue(
        OUTBOX_EVENT.ORDER_CONFIRMATION_EMAIL,
        orderId,
        {
          orderId,
          orderNumber: created.number,
          email: created.email,
          totalTaka: poishaToTaka(created.totalPoisha),
        },
        tx,
      );

      if (userId) {
        await this.notifications.createForUser(
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

  async listAdmin(query: ListOrdersQueryDto) {
    const rows = await this.orders.listAdmin(query);
    return this.toCursorPage(rows, query.limit);
  }

  async getAdmin(orderId: string): Promise<OrderResponseDto> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    return this.toOrderResponse(order);
  }

  async updateStatus(
    actor: JwtPayload,
    orderId: string,
    dto: AdminUpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.customerOrder.findUnique({
        where: { id: orderId },
        include: {
          payment: true,
          shipments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
      if (!order) throw new NotFoundException('Order not found');

      this.assertFulfillmentTransition(order.status, dto.status);

      if (dto.status === OrderStatus.SHIPPED) {
        await this.ensureShipmentForShip(
          tx,
          order.id,
          order.shipments[0] ?? null,
          dto.trackingNumber,
          dto.carrier,
        );
        await this.inventory.consumeForShipment(order.id, tx);
        await tx.customerOrder.update({
          where: { id: order.id },
          data: { status: OrderStatus.SHIPPED, shippedAt: new Date() },
        });
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
        await tx.customerOrder.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() },
        });
      } else if (dto.status === OrderStatus.DELIVERED) {
        await tx.customerOrder.update({
          where: { id: order.id },
          data: { status: OrderStatus.DELIVERED, deliveredAt: new Date() },
        });
        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: { status: PaymentStatus.COLLECTED, collectedAt: new Date() },
          });
        }
      } else {
        await tx.customerOrder.update({
          where: { id: order.id },
          data: { status: dto.status },
        });
      }

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
          before: { status: order.status },
          after: { status: dto.status, note: dto.note ?? null },
        },
        tx,
      );

      await this.outbox.enqueue(
        OUTBOX_EVENT.ORDER_STATUS_EMAIL,
        order.id,
        {
          orderId: order.id,
          orderNumber: order.number,
          email: order.email,
          status: mapStatusToApi(dto.status),
          note: dto.note?.trim() || null,
        },
        tx,
      );

      if (order.userId) {
        const statusLabel = mapStatusToApi(dto.status);
        await this.notifications.createForUser(
          {
            userId: order.userId,
            type:
              dto.status === OrderStatus.SHIPPED
                ? NotificationType.SHIPPING
                : NotificationType.ORDER_STATUS,
            title: `Order ${statusLabel}`,
            body: `Your order ${order.number} is now ${statusLabel}.`,
            href: `/account/orders/${order.id}`,
            dedupeKey: `order:${order.id}:${dto.status}`,
            payload: { orderId: order.id, status: dto.status },
          },
          tx,
        );
      }

      const updated = await tx.customerOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: {
          address: true,
          items: { orderBy: { createdAt: 'asc' } },
          statusHistory: { orderBy: { createdAt: 'asc' } },
          shipments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
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

      await this.createOrUpdateShipment(tx, order.id, dto.trackingNumber, dto.carrier);

      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: 'order.tracking.set',
          resourceType: 'order',
          resourceId: order.id,
          after: { trackingNumber: dto.trackingNumber, carrier: dto.carrier ?? null },
        },
        tx,
      );

      const updated = await tx.customerOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: {
          address: true,
          items: { orderBy: { createdAt: 'asc' } },
          statusHistory: { orderBy: { createdAt: 'asc' } },
          shipments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });

      return this.toOrderResponse(updated);
    });
  }

  async cancel(actor: JwtPayload, orderId: string, dto: AdminCancelOrderDto): Promise<OrderResponseDto> {
    return this.updateStatus(actor, orderId, {
      status: OrderStatus.CANCELLED,
      note: dto.reason,
    });
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
    trackingNumber: string | undefined,
    carrier: string | undefined,
  ): Promise<void> {
    if (existingShipment) return;
    if (!trackingNumber?.trim()) {
      throw new BadRequestException(
        'Tracking number is required before marking the order as shipped',
      );
    }
    await this.createOrUpdateShipment(tx, orderId, trackingNumber, carrier);
  }

  private async createOrUpdateShipment(
    tx: Prisma.TransactionClient,
    orderId: string,
    trackingNumber: string,
    carrier?: string,
  ): Promise<void> {
    const normalizedTracking = trackingNumber.trim();
    const existing = await tx.shipment.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      await tx.shipment.update({
        where: { id: existing.id },
        data: {
          trackingNumber: normalizedTracking,
          carrier: carrier?.trim() || null,
        },
      });
      return;
    }

    await tx.shipment.create({
      data: {
        orderId,
        trackingNumber: normalizedTracking,
        carrier: carrier?.trim() || null,
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
        nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      },
    };
  }

  private toOrderResponse(order: OrderDetailRecord): OrderResponseDto {
    if (!order.address) {
      throw new BadRequestException(`Order ${order.id} is missing address snapshot`);
    }

    return {
      id: order.id,
      number: order.number,
      createdAt: order.createdAt.toISOString(),
      status: mapStatusToApi(order.status),
      items: order.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        slug: item.slug,
        image: item.image,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPrice: poishaToTaka(item.unitPricePoisha),
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
      trackingNumber: order.shipments[0]?.trackingNumber,
      timeline: buildTimeline(order),
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

  return [
    {
      label: 'Order placed',
      at: order.createdAt.toISOString(),
      done: true,
    },
    {
      label: 'Confirmed',
      at: historyAt(OrderStatus.CONFIRMED),
      done: stepDone([
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ]),
    },
    {
      label: 'Processing',
      at: historyAt(OrderStatus.PROCESSING),
      done: stepDone([OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED]),
    },
    {
      label: 'Shipped',
      at: historyAt(OrderStatus.SHIPPED),
      done: stepDone([OrderStatus.SHIPPED, OrderStatus.DELIVERED]),
    },
    {
      label: 'Delivered',
      at: historyAt(OrderStatus.DELIVERED),
      done: reached.has(OrderStatus.DELIVERED),
    },
  ];
}

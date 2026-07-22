import {
  AddressType,
  InventoryMovementType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ReservationStatus,
  ReturnStatus,
  ReturnType,
} from '../../../src/generated/prisma/client';
import { defaultAddressFor } from '../data/addresses';
import { DEMO_CUSTOMERS } from '../data/users';
import { seedOrderNumber, seedTrackingNumber, seedUuid } from '../utils/ids';
import { STANDARD_SHIPPING_POISHA } from '../utils/money';
import type { SeedContext, SeedUserRef } from '../types';
import { seedLog } from '../utils/logger';

interface DemoOrderSpec {
  index: number;
  customerKey: string;
  status: OrderStatus;
  productSlug: string;
  quantity: number;
  couponCode?: 'ELEVATE10' | 'FREESHIP';
  daysAgo: number;
  withReturn?: 'RETURN' | 'EXCHANGE';
}

const DEMO_ORDERS: DemoOrderSpec[] = [
  {
    index: 1,
    customerKey: 'customer-rahim',
    status: OrderStatus.DELIVERED,
    productSlug: 'urban-horizon-distressed-stripe-shirt',
    quantity: 1,
    couponCode: 'ELEVATE10',
    daysAgo: 45,
    withReturn: 'RETURN',
  },
  {
    index: 2,
    customerKey: 'customer-nadia',
    status: OrderStatus.DELIVERED,
    productSlug: 'peach-white-plaid-button-down',
    quantity: 1,
    daysAgo: 30,
  },
  {
    index: 3,
    customerKey: 'customer-farhan',
    status: OrderStatus.SHIPPED,
    productSlug: 'elevate-premium-orange-plaid-cotton-shirt',
    quantity: 1,
    couponCode: 'FREESHIP',
    daysAgo: 5,
  },
  {
    index: 4,
    customerKey: 'customer-mehreen',
    status: OrderStatus.PROCESSING,
    productSlug: 'terracotta-floral-slim-fit-shirt',
    quantity: 1,
    daysAgo: 2,
  },
  {
    index: 5,
    customerKey: 'customer-sakib',
    status: OrderStatus.CONFIRMED,
    productSlug: 'ubaid-classic-pebbled-leather-wallet',
    quantity: 2,
    daysAgo: 1,
  },
  {
    index: 6,
    customerKey: 'customer-anika',
    status: OrderStatus.CANCELLED,
    productSlug: 'dusty-blue-windowpane-check-shirt',
    quantity: 1,
    daysAgo: 20,
  },
  {
    index: 7,
    customerKey: 'customer-rahim',
    status: OrderStatus.DELIVERED,
    productSlug: 'elevate-blue-essentials-dress-shirt',
    quantity: 1,
    daysAgo: 12,
    withReturn: 'EXCHANGE',
  },
  {
    index: 8,
    customerKey: 'customer-nadia',
    status: OrderStatus.PACKED,
    productSlug: 'abstract-geometric-print-shirt',
    quantity: 1,
    daysAgo: 3,
  },
];

function daysAgoDate(days: number, hour = 10): Date {
  const d = new Date('2026-07-20T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

function statusTimeline(
  status: OrderStatus,
  createdAt: Date,
): Partial<{
  confirmedAt: Date;
  processingAt: Date;
  packedAt: Date;
  shippedAt: Date;
  deliveredAt: Date;
  cancelledAt: Date;
}> {
  const addHours = (h: number) => new Date(createdAt.getTime() + h * 3_600_000);
  switch (status) {
    case OrderStatus.CONFIRMED:
      return { confirmedAt: createdAt };
    case OrderStatus.PROCESSING:
      return { confirmedAt: createdAt, processingAt: addHours(6) };
    case OrderStatus.PACKED:
      return { confirmedAt: createdAt, processingAt: addHours(6), packedAt: addHours(24) };
    case OrderStatus.SHIPPED:
      return {
        confirmedAt: createdAt,
        processingAt: addHours(6),
        packedAt: addHours(24),
        shippedAt: addHours(36),
      };
    case OrderStatus.DELIVERED:
      return {
        confirmedAt: createdAt,
        processingAt: addHours(6),
        packedAt: addHours(24),
        shippedAt: addHours(36),
        deliveredAt: addHours(96),
      };
    case OrderStatus.CANCELLED:
      return { confirmedAt: createdAt, cancelledAt: addHours(4) };
    default:
      return { confirmedAt: createdAt };
  }
}

function historyStatuses(status: OrderStatus): OrderStatus[] {
  switch (status) {
    case OrderStatus.CONFIRMED:
      return [OrderStatus.CONFIRMED];
    case OrderStatus.PROCESSING:
      return [OrderStatus.CONFIRMED, OrderStatus.PROCESSING];
    case OrderStatus.PACKED:
      return [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.PACKED];
    case OrderStatus.SHIPPED:
      return [
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
        OrderStatus.PACKED,
        OrderStatus.SHIPPED,
      ];
    case OrderStatus.DELIVERED:
      return [
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
        OrderStatus.PACKED,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ];
    case OrderStatus.CANCELLED:
      return [OrderStatus.CONFIRMED, OrderStatus.CANCELLED];
    default:
      return [status];
  }
}

/**
 * Applies a SALE movement and decrements onHand once (idempotent via key).
 * Used for SHIPPED/DELIVERED demo orders so stock stays consistent.
 */
async function applySaleIfNeeded(
  ctx: SeedContext,
  input: {
    orderNumber: string;
    variantId: string;
    locationId: string;
    quantity: number;
  },
): Promise<void> {
  const key = `seed:sale:v1:${input.orderNumber}:${input.variantId}`;
  const existing = await ctx.prisma.inventoryMovement.findUnique({
    where: { idempotencyKey: key },
    select: { id: true },
  });
  if (existing) return;

  const balance = await ctx.prisma.inventoryBalance.findUnique({
    where: {
      variantId_locationId: {
        variantId: input.variantId,
        locationId: input.locationId,
      },
    },
  });
  if (!balance) return;

  const nextOnHand = Math.max(0, balance.onHand - input.quantity);
  await ctx.prisma.$transaction([
    ctx.prisma.inventoryBalance.update({
      where: { id: balance.id },
      data: {
        onHand: nextOnHand,
        version: { increment: 1 },
      },
    }),
    ctx.prisma.inventoryMovement.create({
      data: {
        variantId: input.variantId,
        locationId: input.locationId,
        type: InventoryMovementType.SALE,
        quantity: -input.quantity,
        balanceAfter: nextOnHand,
        idempotencyKey: key,
        note: `Seed sale for ${input.orderNumber}`,
      },
    }),
  ]);
}

async function applyReserveIfNeeded(
  ctx: SeedContext,
  input: {
    orderNumber: string;
    variantId: string;
    locationId: string;
    quantity: number;
  },
): Promise<void> {
  const key = `seed:reserve:v1:${input.orderNumber}:${input.variantId}`;
  const existing = await ctx.prisma.inventoryMovement.findUnique({
    where: { idempotencyKey: key },
    select: { id: true },
  });
  if (existing) return;

  const balance = await ctx.prisma.inventoryBalance.findUnique({
    where: {
      variantId_locationId: {
        variantId: input.variantId,
        locationId: input.locationId,
      },
    },
  });
  if (!balance) return;

  const available = balance.onHand - balance.reserved;
  const qty = Math.min(input.quantity, Math.max(0, available));
  if (qty <= 0) return;

  await ctx.prisma.$transaction([
    ctx.prisma.inventoryBalance.update({
      where: { id: balance.id },
      data: {
        reserved: { increment: qty },
        version: { increment: 1 },
      },
    }),
    ctx.prisma.inventoryMovement.create({
      data: {
        variantId: input.variantId,
        locationId: input.locationId,
        type: InventoryMovementType.RESERVE,
        quantity: qty,
        balanceAfter: balance.onHand,
        idempotencyKey: key,
        note: `Seed reserve for ${input.orderNumber}`,
      },
    }),
  ]);
}

export async function seedOrders(ctx: SeedContext): Promise<void> {
  const { prisma, users, locationId } = ctx;
  if (!locationId) {
    throw new Error('locationId missing — run catalog seeder first');
  }

  const customerByKey = new Map(DEMO_CUSTOMERS.map((spec, i) => [spec.key, users.customers[i]!]));

  let created = 0;
  let skipped = 0;

  for (const spec of DEMO_ORDERS) {
    const number = seedOrderNumber(spec.index);
    const existing = await prisma.customerOrder.findUnique({
      where: { number },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const customer = customerByKey.get(spec.customerKey);
    if (!customer) continue;

    const product = await prisma.product.findUnique({
      where: { slug: spec.productSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        currentPriceAmount: true,
        media: {
          where: { isPrimary: true },
          select: { url: true },
          take: 1,
        },
        variants: {
          where: { isActive: true, deletedAt: null },
          select: { id: true, size: true, color: true },
          orderBy: { position: 'asc' },
          take: 2,
        },
      },
    });
    if (!product || product.variants.length === 0) {
      seedLog(`Skipping order ${number}: product ${spec.productSlug} unavailable.`);
      continue;
    }

    const variant = product.variants[0]!;
    const unitPrice = product.currentPriceAmount;
    const subtotal = unitPrice * BigInt(spec.quantity);
    let discountPoisha = 0n;
    let shippingPoisha = STANDARD_SHIPPING_POISHA;
    if (spec.couponCode === 'ELEVATE10' && subtotal >= 150_000n) {
      discountPoisha = (subtotal * 10n) / 100n;
    } else if (spec.couponCode === 'FREESHIP') {
      shippingPoisha = 0n;
    }
    const totalPoisha = subtotal - discountPoisha + shippingPoisha;
    const createdAt = daysAgoDate(spec.daysAgo);
    const stamps = statusTimeline(spec.status, createdAt);
    const orderId = seedUuid(`order:${number}`);
    const addr = defaultAddressFor(DEMO_CUSTOMERS, spec.customerKey);
    const image = product.media[0]?.url ?? '/images/home/product-1.webp';

    const isTerminalConsumed =
      spec.status === OrderStatus.SHIPPED || spec.status === OrderStatus.DELIVERED;
    const isCancelled = spec.status === OrderStatus.CANCELLED;
    const reservationStatus = isTerminalConsumed
      ? ReservationStatus.CONSUMED
      : isCancelled
        ? ReservationStatus.RELEASED
        : ReservationStatus.ACTIVE;

    await prisma.customerOrder.create({
      data: {
        id: orderId,
        number,
        userId: customer.id,
        email: customer.email,
        phone: customer.phone,
        status: spec.status,
        subtotalPoisha: subtotal,
        shippingPoisha,
        discountPoisha,
        totalPoisha,
        couponCode: spec.couponCode ?? null,
        paymentMethod: PaymentMethod.COD,
        createdAt,
        ...stamps,
        address: {
          create: {
            id: seedUuid(`order-address:${number}`),
            type: AddressType.SHIPPING,
            fullName: `${customer.firstName} ${customer.lastName}`,
            phone: customer.phone,
            line1: addr.line1,
            line2: addr.line2 ?? null,
            city: addr.city,
            district: addr.district,
            postalCode: addr.postalCode,
            country: 'Bangladesh',
          },
        },
        items: {
          create: [
            {
              id: seedUuid(`order-item:${number}:0`),
              productId: product.id,
              variantId: variant.id,
              name: product.name,
              slug: product.slug,
              image,
              size: variant.size,
              color: variant.color,
              quantity: spec.quantity,
              unitPricePoisha: unitPrice,
            },
          ],
        },
        statusHistory: {
          create: historyStatuses(spec.status).map((status, i) => ({
            status,
            note: `Seed transition to ${status}`,
            actorId: users.admin?.id ?? null,
            createdAt: new Date(createdAt.getTime() + i * 3_600_000),
          })),
        },
        payment: {
          create: {
            id: seedUuid(`payment:${number}`),
            method: PaymentMethod.COD,
            status:
              spec.status === OrderStatus.DELIVERED
                ? PaymentStatus.COLLECTED
                : isCancelled
                  ? PaymentStatus.CANCELLED
                  : PaymentStatus.PENDING,
            amountPoisha: totalPoisha,
            currencyCode: 'BDT',
            providerRef: `seed-cod:${number}`,
            collectedAt:
              spec.status === OrderStatus.DELIVERED ? (stamps.deliveredAt ?? createdAt) : null,
          },
        },
        reservation: {
          create: {
            id: seedUuid(`reservation:${number}`),
            status: reservationStatus,
            expiresAt:
              isTerminalConsumed || isCancelled
                ? null
                : new Date(createdAt.getTime() + 7 * 24 * 3_600_000),
            releasedAt: isCancelled ? (stamps.cancelledAt ?? createdAt) : null,
            items: {
              create: [
                {
                  id: seedUuid(`reservation-item:${number}:0`),
                  variantId: variant.id,
                  locationId,
                  quantity: spec.quantity,
                },
              ],
            },
          },
        },
      },
    });

    if (spec.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: spec.couponCode },
        select: { id: true },
      });
      if (coupon) {
        await prisma.couponRedemption.create({
          data: {
            id: seedUuid(`redemption:${number}`),
            couponId: coupon.id,
            userId: customer.id,
            orderId,
            discountPoisha,
            shippingWaived: spec.couponCode === 'FREESHIP',
            createdAt,
          },
        });
      }
    }

    if (isTerminalConsumed) {
      await applySaleIfNeeded(ctx, {
        orderNumber: number,
        variantId: variant.id,
        locationId,
        quantity: spec.quantity,
      });
      await prisma.shipment.create({
        data: {
          id: seedUuid(`shipment:${number}`),
          orderId,
          trackingNumber: seedTrackingNumber(number),
          carrier: 'Pathao Parcel',
          shippedAt: stamps.shippedAt ?? createdAt,
        },
      });
    } else if (!isCancelled) {
      await applyReserveIfNeeded(ctx, {
        orderNumber: number,
        variantId: variant.id,
        locationId,
        quantity: spec.quantity,
      });
    }

    if (spec.withReturn && spec.status === OrderStatus.DELIVERED) {
      await seedReturnForOrder(ctx, {
        orderId,
        orderNumber: number,
        customer,
        type: spec.withReturn === 'RETURN' ? ReturnType.RETURN : ReturnType.EXCHANGE,
        createdAt: stamps.deliveredAt ?? createdAt,
        exchangeVariantId:
          spec.withReturn === 'EXCHANGE' ? (product.variants[1]?.id ?? null) : null,
      });
    }

    created += 1;
  }

  seedLog(`Seeded orders (${created} created, ${skipped} already present).`);
}

async function seedReturnForOrder(
  ctx: SeedContext,
  input: {
    orderId: string;
    orderNumber: string;
    customer: SeedUserRef;
    type: ReturnType;
    createdAt: Date;
    exchangeVariantId: string | null;
  },
): Promise<void> {
  const returnId = seedUuid(`return:${input.orderNumber}`);
  const existing = await ctx.prisma.returnRequest.findUnique({
    where: { id: returnId },
    select: { id: true },
  });
  if (existing) return;

  const orderItem = await ctx.prisma.orderItem.findFirst({
    where: { orderId: input.orderId },
    select: { id: true, variantId: true, quantity: true },
  });
  if (!orderItem) return;

  const completed = input.type === ReturnType.RETURN;
  await ctx.prisma.returnRequest.create({
    data: {
      id: returnId,
      orderId: input.orderId,
      userId: input.customer.id,
      type: input.type,
      status: completed ? ReturnStatus.COMPLETED : ReturnStatus.APPROVED,
      reason:
        input.type === ReturnType.RETURN
          ? 'Size felt oversized after first wash — requesting refund.'
          : 'Prefer alternate colorway from the same drop.',
      conditionAttested: true,
      createdAt: input.createdAt,
      decidedAt: new Date(input.createdAt.getTime() + 24 * 3_600_000),
      completedAt: completed ? new Date(input.createdAt.getTime() + 72 * 3_600_000) : null,
      items: {
        create: [
          {
            id: seedUuid(`return-item:${input.orderNumber}:0`),
            orderItemId: orderItem.id,
            variantId: orderItem.variantId,
            quantity: 1,
            exchangeVariantId: input.exchangeVariantId,
          },
        ],
      },
      statusHistory: {
        create: [
          {
            status: ReturnStatus.PENDING,
            note: 'Seed return submitted',
            createdAt: input.createdAt,
          },
          {
            status: ReturnStatus.APPROVED,
            note: 'Seed return approved',
            actorId: ctx.users.admin?.id ?? null,
            createdAt: new Date(input.createdAt.getTime() + 24 * 3_600_000),
          },
          ...(completed
            ? [
                {
                  status: ReturnStatus.COMPLETED,
                  note: 'Seed return completed',
                  actorId: ctx.users.admin?.id ?? null,
                  createdAt: new Date(input.createdAt.getTime() + 72 * 3_600_000),
                },
              ]
            : []),
        ],
      },
    },
  });

  // Mark parent order as RETURNED/EXCHANGED when the demo return is completed.
  if (completed) {
    await ctx.prisma.customerOrder.update({
      where: { id: input.orderId },
      data: {
        status: OrderStatus.RETURNED,
        returnedAt: new Date(input.createdAt.getTime() + 72 * 3_600_000),
      },
    });
  } else if (input.type === ReturnType.EXCHANGE) {
    await ctx.prisma.customerOrder.update({
      where: { id: input.orderId },
      data: {
        status: OrderStatus.EXCHANGED,
        exchangedAt: new Date(input.createdAt.getTime() + 48 * 3_600_000),
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

/** Recognized revenue: collected payments only (COD is collected on delivery). */
const revenueEvents = Prisma.sql`
  WITH revenue_events AS (
    SELECT p."amountPoisha" AS amount, p."collectedAt" AS occurred_at, o.id AS order_id
    FROM payment p
    JOIN customer_order o ON o.id = p."orderId"
    WHERE p.status = 'COLLECTED' AND p."collectedAt" IS NOT NULL
  )
`;

const recognizedOrderJoin = Prisma.sql`
  JOIN payment p ON p."orderId" = o.id
  AND p.status = 'COLLECTED' AND p."collectedAt" IS NOT NULL
`;

export type OverviewRow = {
  total_revenue: bigint;
  total_orders: bigint;
  orders_today: bigint;
  orders_previous_day: bigint;
  revenue_today: bigint;
  revenue_previous_day: bigint;
  revenue_7d: bigint;
  revenue_previous_7d: bigint;
  revenue_30d: bigint;
  revenue_previous_30d: bigint;
};

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<OverviewRow> {
    const [row] = await this.prisma.$queryRaw<OverviewRow[]>(Prisma.sql`
      ${revenueEvents}
      SELECT
        COALESCE((SELECT SUM(amount) FROM revenue_events), 0)::bigint AS total_revenue,
        (SELECT COUNT(*) FROM customer_order)::bigint AS total_orders,
        (SELECT COUNT(*) FROM customer_order WHERE "createdAt" >= date_trunc('day', now()))::bigint AS orders_today,
        (SELECT COUNT(*) FROM customer_order WHERE "createdAt" >= date_trunc('day', now()) - interval '1 day'
          AND "createdAt" < date_trunc('day', now()))::bigint AS orders_previous_day,
        COALESCE((SELECT SUM(amount) FROM revenue_events WHERE occurred_at >= date_trunc('day', now())), 0)::bigint AS revenue_today,
        COALESCE((SELECT SUM(amount) FROM revenue_events WHERE occurred_at >= date_trunc('day', now()) - interval '1 day'
          AND occurred_at < date_trunc('day', now())), 0)::bigint AS revenue_previous_day,
        COALESCE((SELECT SUM(amount) FROM revenue_events WHERE occurred_at >= now() - interval '7 days'), 0)::bigint AS revenue_7d,
        COALESCE((SELECT SUM(amount) FROM revenue_events WHERE occurred_at >= now() - interval '14 days'
          AND occurred_at < now() - interval '7 days'), 0)::bigint AS revenue_previous_7d,
        COALESCE((SELECT SUM(amount) FROM revenue_events WHERE occurred_at >= now() - interval '30 days'), 0)::bigint AS revenue_30d,
        COALESCE((SELECT SUM(amount) FROM revenue_events WHERE occurred_at >= now() - interval '60 days'
          AND occurred_at < now() - interval '30 days'), 0)::bigint AS revenue_previous_30d
    `);
    return row;
  }

  sales(from: Date, to: Date, granularity: 'day' | 'month') {
    const trunc = Prisma.raw(granularity === 'month' ? `'month'` : `'day'`);
    return this.prisma.$queryRaw<Array<{ bucket: Date; revenue: bigint; orders: bigint }>>(
      Prisma.sql`
        ${revenueEvents}
        SELECT (date_trunc(${trunc}, occurred_at AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC' AS bucket,
               COALESCE(SUM(amount), 0)::bigint AS revenue,
               COUNT(DISTINCT order_id)::bigint AS orders
        FROM revenue_events
        WHERE occurred_at >= ${from} AND occurred_at <= ${to}
        GROUP BY 1
        ORDER BY 1
      `,
    );
  }

  bestsellers(limit: number) {
    return this.prisma.$queryRaw<
      Array<{ product_id: string; name: string; slug: string; units: bigint; revenue: bigint }>
    >(Prisma.sql`
      SELECT i."productId" AS product_id, i.name, i.slug,
             SUM(i.quantity)::bigint AS units,
             SUM(i.quantity * i."unitPricePoisha")::bigint AS revenue
      FROM order_item i
      JOIN customer_order o ON o.id = i."orderId"
      ${recognizedOrderJoin}
      GROUP BY i."productId", i.name, i.slug
      ORDER BY units DESC, revenue DESC
      LIMIT ${limit}
    `);
  }

  async customerSummary(highValueThresholdPoisha: bigint) {
    const [counts, topCustomers] = await Promise.all([
      this.prisma.user.aggregate({
        where: { role: Role.CUSTOMER, deletedAt: null },
        _count: true,
      }),
      this.prisma.customerMetric.findMany({
        take: 10,
        orderBy: { lifetimeValuePoisha: 'desc' },
        where: { user: { deletedAt: null, role: Role.CUSTOMER } },
        select: {
          lifetimeValuePoisha: true,
          orderCount: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
    ]);
    const [newCustomers, highValue] = await Promise.all([
      this.prisma.user.count({
        where: {
          role: Role.CUSTOMER,
          deletedAt: null,
          createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
        },
      }),
      this.prisma.customerMetric.count({
        where: {
          lifetimeValuePoisha: { gte: highValueThresholdPoisha },
          user: { deletedAt: null },
        },
      }),
    ]);
    return { totalCustomers: counts._count, newCustomers, highValue, topCustomers };
  }

  async inventorySummary() {
    const [counts] = await this.prisma.$queryRaw<
      Array<{ low_stock: bigint; out_of_stock: bigint }>
    >(Prisma.sql`
      WITH sku_stock AS (
        SELECT v.id, SUM(b."onHand" - b.reserved)::integer AS available,
               SUM(b."lowStockThreshold")::integer AS threshold
        FROM product_variant v
        JOIN inventory_balance b ON b."variantId" = v.id
        WHERE v."deletedAt" IS NULL AND v."isActive" = true
        GROUP BY v.id
      )
      SELECT COUNT(*) FILTER (WHERE available > 0 AND available <= threshold)::bigint AS low_stock,
             COUNT(*) FILTER (WHERE available <= 0)::bigint AS out_of_stock
      FROM sku_stock
    `);
    const topLowSkus = await this.prisma.$queryRaw<
      Array<{ variant_id: string; sku: string; product_name: string; available: bigint; threshold: bigint }>
    >(Prisma.sql`
      SELECT v.id AS variant_id, v.sku, p.name AS product_name,
             SUM(b."onHand" - b.reserved)::bigint AS available,
             SUM(b."lowStockThreshold")::bigint AS threshold
      FROM product_variant v
      JOIN product p ON p.id = v."productId"
      JOIN inventory_balance b ON b."variantId" = v.id
      WHERE v."deletedAt" IS NULL AND v."isActive" = true
      GROUP BY v.id, v.sku, p.name
      HAVING SUM(b."onHand" - b.reserved) <= SUM(b."lowStockThreshold")
      ORDER BY available ASC, v.sku ASC
      LIMIT 20
    `);
    return { counts, topLowSkus };
  }
}

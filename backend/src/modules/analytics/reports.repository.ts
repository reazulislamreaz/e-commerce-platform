import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ReportExportFormat,
  ReportExportStatus,
  ReportExportType,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export type ExportRow = Record<string, string | number | bigint | Date | null>;

/** A single column: human-readable label shown in the file + DB alias used to read the row value. */
export type ColumnSpec = { label: string; key: string };

export const REPORT_EXPORT_BATCH_SIZE = 500;

/**
 * Column definitions for every report type.
 *
 * `label`  — the human-readable header written to the exported file.
 * `key`    — the alias used in the SQL query; used to read the value from each row.
 *
 * The SQL queries in `exportRowsPage` must alias every selected expression to match
 * the `key` exactly.  Keeping label and key separate lets us show friendly names
 * while still mapping rows correctly.
 */
export const REPORT_EXPORT_COLUMNS: Record<ReportExportType, ColumnSpec[]> = {
  [ReportExportType.REVENUE]: [
    { label: 'Date', key: 'date' },
    { label: 'Order Number', key: 'orderNumber' },
    { label: 'Gross Revenue (৳)', key: 'grossRevenueTaka' },
    { label: 'Discount (৳)', key: 'discountTaka' },
    { label: 'Shipping (৳)', key: 'shippingTaka' },
    { label: 'Net Revenue (৳)', key: 'netRevenueTaka' },
    { label: 'Currency', key: 'currencyCode' },
  ],
  [ReportExportType.ORDERS]: [
    { label: 'Order ID', key: 'orderNumber' },
    { label: 'Customer Name', key: 'customerName' },
    { label: 'Customer Email', key: 'email' },
    { label: 'Customer Phone', key: 'phone' },
    { label: 'Payment Method', key: 'paymentMethod' },
    { label: 'Payment Status', key: 'paymentStatus' },
    { label: 'Order Status', key: 'status' },
    { label: 'Delivery Partner', key: 'deliveryPartner' },
    { label: 'Subtotal (৳)', key: 'subtotalTaka' },
    { label: 'Discount (৳)', key: 'discountTaka' },
    { label: 'Shipping (৳)', key: 'shippingTaka' },
    { label: 'Total (৳)', key: 'totalTaka' },
    { label: 'Order Date', key: 'orderDate' },
  ],
  [ReportExportType.PRODUCTS]: [
    { label: 'Product Name', key: 'productName' },
    { label: 'SKU', key: 'sku' },
    { label: 'Category', key: 'category' },
    { label: 'Brand', key: 'brand' },
    { label: 'Price (৳)', key: 'priceTaka' },
    { label: 'Status', key: 'productStatus' },
    { label: 'Units Sold', key: 'unitsSold' },
    { label: 'Revenue (৳)', key: 'revenueTaka' },
    { label: 'Created Date', key: 'createdDate' },
  ],
  [ReportExportType.CUSTOMERS]: [
    { label: 'Name', key: 'customerName' },
    { label: 'Email', key: 'email' },
    { label: 'Phone', key: 'phone' },
    { label: 'Status', key: 'status' },
    { label: 'Total Orders', key: 'orderCount' },
    { label: 'Total Spending (৳)', key: 'lifetimeValueTaka' },
    { label: 'Registration Date', key: 'registrationDate' },
  ],
  [ReportExportType.INVENTORY]: [
    { label: 'Product', key: 'product' },
    { label: 'SKU', key: 'sku' },
    { label: 'Size', key: 'size' },
    { label: 'Color', key: 'color' },
    { label: 'Location', key: 'location' },
    { label: 'Current Stock', key: 'onHand' },
    { label: 'Reserved Stock', key: 'reserved' },
    { label: 'Available Stock', key: 'available' },
    { label: 'Low Stock Threshold', key: 'lowStockThreshold' },
    { label: 'Low Stock Status', key: 'lowStockStatus' },
  ],
};

/** Convert poisha (integer 1/100 of taka) to a formatted taka string with 2 decimal places. */
function poishaToTaka(poisha: bigint | number | null): string {
  if (poisha == null) return '0.00';
  const n = typeof poisha === 'bigint' ? Number(poisha) : poisha;
  return (n / 100).toFixed(2);
}

/** Format a Date or ISO string as YYYY-MM-DD. */
function formatDate(value: Date | string | null): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(requestedBy: string, type: ReportExportType, format: ReportExportFormat, params?: object) {
    return this.prisma.reportExportJob.create({
      data: {
        requestedBy,
        type,
        format,
        params: params ? (params as Prisma.InputJsonObject) : undefined,
      },
    });
  }

  findOwned(id: string, requestedBy: string) {
    return this.prisma.reportExportJob.findFirst({ where: { id, requestedBy } });
  }

  findById(id: string) {
    return this.prisma.reportExportJob.findUnique({ where: { id } });
  }

  markProcessing(id: string) {
    return this.prisma.reportExportJob.update({
      where: { id },
      data: { status: ReportExportStatus.PROCESSING, errorMessage: null },
    });
  }

  markReady(id: string, filePath: string, fileName: string, rowCount: number) {
    const now = new Date();
    return this.prisma.reportExportJob.update({
      where: { id },
      data: {
        status: ReportExportStatus.READY,
        filePath,
        fileName,
        rowCount,
        completedAt: now,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    });
  }

  markFailed(id: string, message: string) {
    return this.prisma.reportExportJob.update({
      where: { id },
      data: { status: ReportExportStatus.FAILED, errorMessage: message.slice(0, 500) },
    });
  }

  listExpired() {
    return this.prisma.reportExportJob.findMany({
      where: { expiresAt: { lt: new Date() }, filePath: { not: null } },
      select: { id: true, filePath: true },
      take: 100,
    });
  }

  clearExpiredFile(id: string) {
    return this.prisma.reportExportJob.update({
      where: { id },
      data: { filePath: null },
    });
  }

  /** Returns the ordered column specs (label + key) for the given report type. */
  exportColumns(type: ReportExportType): ColumnSpec[] {
    return REPORT_EXPORT_COLUMNS[type];
  }

  /**
   * Fetch one page of raw database rows for the given report type.
   *
   * Each returned row is a plain object whose keys match the `key` field in
   * `REPORT_EXPORT_COLUMNS[type]`.  The processor iterates over column specs
   * and looks up `row[spec.key]` to get each cell value.
   *
   * Values are returned as primitives (string, number, Date).  Currency values
   * are already converted to taka strings; dates are formatted as YYYY-MM-DD.
   */
  async exportRowsPage(
    type: ReportExportType,
    from: Date | undefined,
    to: Date | undefined,
    offset: number,
    limit: number,
  ): Promise<ExportRow[]> {
    const lower = from ?? new Date(0);
    const upper = to ?? new Date();

    switch (type) {
      case ReportExportType.REVENUE:
        return this.revenueRows(lower, upper, offset, limit);
      case ReportExportType.ORDERS:
        return this.ordersRows(lower, upper, offset, limit);
      case ReportExportType.PRODUCTS:
        return this.productsRows(lower, upper, offset, limit);
      case ReportExportType.CUSTOMERS:
        return this.customersRows(lower, upper, offset, limit);
      case ReportExportType.INVENTORY:
        return this.inventoryRows(offset, limit);
    }
  }

  // ---------------------------------------------------------------------------
  // Private per-report query methods
  // ---------------------------------------------------------------------------

  private async revenueRows(
    lower: Date,
    upper: Date,
    offset: number,
    limit: number,
  ): Promise<ExportRow[]> {
    type Row = {
      date: Date;
      orderNumber: string;
      grossRevenueTaka: bigint;
      discountTaka: bigint;
      shippingTaka: bigint;
      netRevenueTaka: bigint;
      currencyCode: string;
    };
    const rows = await this.prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT
        p."collectedAt"                          AS date,
        o.number                                 AS "orderNumber",
        o."subtotalPoisha"                       AS "grossRevenueTaka",
        o."discountPoisha"                       AS "discountTaka",
        o."shippingPoisha"                       AS "shippingTaka",
        (o."subtotalPoisha" - o."discountPoisha" + o."shippingPoisha") AS "netRevenueTaka",
        COALESCE(p."currencyCode", 'BDT')        AS "currencyCode"
      FROM payment p
      JOIN customer_order o ON o.id = p."orderId"
      WHERE p.status = 'COLLECTED'
        AND p."collectedAt" BETWEEN ${lower} AND ${upper}
      ORDER BY p."collectedAt" ASC, o.number ASC
      OFFSET ${offset} LIMIT ${limit}
    `);
    return rows.map((r) => ({
      date: formatDate(r.date),
      orderNumber: r.orderNumber,
      grossRevenueTaka: poishaToTaka(r.grossRevenueTaka),
      discountTaka: poishaToTaka(r.discountTaka),
      shippingTaka: poishaToTaka(r.shippingTaka),
      netRevenueTaka: poishaToTaka(r.netRevenueTaka),
      currencyCode: r.currencyCode,
    }));
  }

  private async ordersRows(
    lower: Date,
    upper: Date,
    offset: number,
    limit: number,
  ): Promise<ExportRow[]> {
    type Row = {
      orderNumber: string;
      customerName: string | null;
      email: string | null;
      phone: string | null;
      paymentMethod: string;
      paymentStatus: string | null;
      status: string;
      deliveryPartner: string | null;
      subtotalTaka: bigint;
      discountTaka: bigint;
      shippingTaka: bigint;
      totalTaka: bigint;
      orderDate: Date;
    };
    const rows = await this.prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT
        o.number                                      AS "orderNumber",
        NULLIF(TRIM(COALESCE(a."fullName", u."firstName" || ' ' || u."lastName")), '') AS "customerName",
        o.email                                       AS email,
        COALESCE(a.phone, o.phone)                    AS phone,
        INITCAP(REPLACE(o."paymentMethod"::text, '_', ' ')) AS "paymentMethod",
        INITCAP(REPLACE(COALESCE(py.status::text, 'PENDING'), '_', ' ')) AS "paymentStatus",
        INITCAP(REPLACE(o.status::text, '_', ' '))    AS status,
        dp."companyName"                              AS "deliveryPartner",
        o."subtotalPoisha"                            AS "subtotalTaka",
        o."discountPoisha"                            AS "discountTaka",
        o."shippingPoisha"                            AS "shippingTaka",
        o."totalPoisha"                               AS "totalTaka",
        o."createdAt"                                 AS "orderDate"
      FROM customer_order o
      LEFT JOIN "User" u ON u.id = o."userId"
      LEFT JOIN order_address a ON a."orderId" = o.id
      LEFT JOIN shipment s ON s."orderId" = o.id
      LEFT JOIN delivery_partner dp ON dp.id = s."deliveryPartnerId"
      LEFT JOIN LATERAL (
        SELECT status FROM payment
        WHERE "orderId" = o.id
        ORDER BY "createdAt" DESC
        LIMIT 1
      ) py ON true
      WHERE o."createdAt" BETWEEN ${lower} AND ${upper}
      ORDER BY o."createdAt" ASC, o.number ASC
      OFFSET ${offset} LIMIT ${limit}
    `);
    return rows.map((r) => ({
      orderNumber: r.orderNumber,
      customerName: r.customerName ?? '',
      email: r.email ?? '',
      phone: r.phone ?? '',
      paymentMethod: r.paymentMethod ?? '',
      paymentStatus: r.paymentStatus ?? '',
      status: r.status ?? '',
      deliveryPartner: r.deliveryPartner ?? '',
      subtotalTaka: poishaToTaka(r.subtotalTaka),
      discountTaka: poishaToTaka(r.discountTaka),
      shippingTaka: poishaToTaka(r.shippingTaka),
      totalTaka: poishaToTaka(r.totalTaka),
      orderDate: formatDate(r.orderDate),
    }));
  }

  private async productsRows(
    lower: Date,
    upper: Date,
    offset: number,
    limit: number,
  ): Promise<ExportRow[]> {
    type Row = {
      productName: string;
      sku: string | null;
      category: string | null;
      brand: string | null;
      priceTaka: bigint | null;
      productStatus: string;
      unitsSold: bigint;
      revenueTaka: bigint;
      createdDate: Date;
    };
    const rows = await this.prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT
        p.name                                       AS "productName",
        MIN(v.sku)                                   AS sku,
        MIN(cat.name)                                AS category,
        b.name                                       AS brand,
        MAX(pr."amountPoisha")                       AS "priceTaka",
        INITCAP(REPLACE(p.status::text, '_', ' '))   AS "productStatus",
        COALESCE(SUM(oi.quantity)::bigint, 0)        AS "unitsSold",
        COALESCE(SUM(oi.quantity * oi."unitPricePoisha")::bigint, 0) AS "revenueTaka",
        p."createdAt"                                AS "createdDate"
      FROM product p
      LEFT JOIN brand b ON b.id = p."brandId"
      LEFT JOIN product_category pc ON pc."productId" = p.id AND pc."isPrimary" = true
      LEFT JOIN category cat ON cat.id = pc."categoryId"
      LEFT JOIN product_variant v ON v."productId" = p.id AND v."deletedAt" IS NULL
      LEFT JOIN product_price pr ON pr."productId" = p.id AND pr."validTo" IS NULL
      LEFT JOIN order_item oi ON oi."productId" = p.id
      LEFT JOIN customer_order o ON o.id = oi."orderId"
      LEFT JOIN payment pay ON pay."orderId" = o.id
        AND pay.status = 'COLLECTED'
        AND pay."collectedAt" BETWEEN ${lower} AND ${upper}
      WHERE p."deletedAt" IS NULL
      GROUP BY p.id, p.name, p.status, p."createdAt", b.name
      ORDER BY "unitsSold" DESC, p.name ASC
      OFFSET ${offset} LIMIT ${limit}
    `);
    return rows.map((r) => ({
      productName: r.productName,
      sku: r.sku ?? '',
      category: r.category ?? '',
      brand: r.brand ?? '',
      priceTaka: poishaToTaka(r.priceTaka),
      productStatus: r.productStatus ?? '',
      unitsSold: typeof r.unitsSold === 'bigint' ? Number(r.unitsSold) : (r.unitsSold ?? 0),
      revenueTaka: poishaToTaka(r.revenueTaka),
      createdDate: formatDate(r.createdDate),
    }));
  }

  private async customersRows(
    lower: Date,
    upper: Date,
    offset: number,
    limit: number,
  ): Promise<ExportRow[]> {
    type Row = {
      customerName: string | null;
      email: string;
      phone: string;
      status: string;
      orderCount: bigint;
      lifetimeValueTaka: bigint;
      registrationDate: Date;
    };
    const rows = await this.prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT
        NULLIF(TRIM(COALESCE(u."firstName", '') || ' ' || COALESCE(u."lastName", '')), '') AS "customerName",
        u.email,
        u.phone,
        INITCAP(REPLACE(u.status::text, '_', ' ')) AS status,
        COALESCE(m."orderCount", 0)::bigint         AS "orderCount",
        COALESCE(m."lifetimeValuePoisha", 0)::bigint AS "lifetimeValueTaka",
        u."createdAt"                               AS "registrationDate"
      FROM "User" u
      LEFT JOIN customer_metric m ON m."userId" = u.id
      WHERE u.role = 'CUSTOMER'
        AND u."deletedAt" IS NULL
        AND u."createdAt" BETWEEN ${lower} AND ${upper}
      ORDER BY "lifetimeValueTaka" DESC, u.email ASC
      OFFSET ${offset} LIMIT ${limit}
    `);
    return rows.map((r) => ({
      customerName: r.customerName ?? '',
      email: r.email,
      phone: r.phone,
      status: r.status,
      orderCount: typeof r.orderCount === 'bigint' ? Number(r.orderCount) : (r.orderCount ?? 0),
      lifetimeValueTaka: poishaToTaka(r.lifetimeValueTaka),
      registrationDate: formatDate(r.registrationDate),
    }));
  }

  private async inventoryRows(offset: number, limit: number): Promise<ExportRow[]> {
    type Row = {
      product: string;
      sku: string;
      size: string | null;
      color: string | null;
      location: string;
      onHand: number;
      reserved: number;
      available: number;
      lowStockThreshold: number;
    };
    const rows = await this.prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT
        p.name                                       AS product,
        v.sku,
        v.size,
        v.color,
        l.code                                       AS location,
        b."onHand",
        b.reserved,
        (b."onHand" - b.reserved)                   AS available,
        b."lowStockThreshold"
      FROM inventory_balance b
      JOIN product_variant v ON v.id = b."variantId"
      JOIN product p ON p.id = v."productId"
      JOIN inventory_location l ON l.id = b."locationId"
      WHERE v."deletedAt" IS NULL
      ORDER BY p.name ASC, v.sku ASC, l.code ASC
      OFFSET ${offset} LIMIT ${limit}
    `);
    return rows.map((r) => {
      const available = r.available ?? 0;
      const threshold = r.lowStockThreshold ?? 0;
      const lowStockStatus =
        available <= 0 ? 'Out of Stock' : available <= threshold ? 'Low Stock' : 'In Stock';
      return {
        product: r.product,
        sku: r.sku,
        size: r.size ?? '',
        color: r.color ?? '',
        location: r.location,
        onHand: r.onHand ?? 0,
        reserved: r.reserved ?? 0,
        available,
        lowStockThreshold: threshold,
        lowStockStatus,
      };
    });
  }
}

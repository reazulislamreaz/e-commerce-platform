import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ReportExportFormat,
  ReportExportStatus,
  ReportExportType,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export type ExportRow = Record<string, string | number | bigint | Date | null>;

export const REPORT_EXPORT_BATCH_SIZE = 500;

export const REPORT_EXPORT_HEADERS: Record<ReportExportType, string[]> = {
  [ReportExportType.REVENUE]: ['collectedAt', 'orderNumber', 'amountPoisha', 'currencyCode'],
  [ReportExportType.ORDERS]: [
    'number',
    'email',
    'status',
    'paymentMethod',
    'subtotalPoisha',
    'shippingPoisha',
    'discountPoisha',
    'totalPoisha',
    'createdAt',
  ],
  [ReportExportType.PRODUCTS]: ['productId', 'name', 'slug', 'units', 'revenuePoisha'],
  [ReportExportType.CUSTOMERS]: [
    'id',
    'email',
    'firstName',
    'lastName',
    'createdAt',
    'orderCount',
    'lifetimeValuePoisha',
  ],
  [ReportExportType.INVENTORY]: [
    'product',
    'sku',
    'size',
    'color',
    'location',
    'onHand',
    'reserved',
    'available',
    'lowStockThreshold',
  ],
};

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

  exportHeaders(type: ReportExportType): string[] {
    return REPORT_EXPORT_HEADERS[type];
  }

  exportRowsPage(
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
        return this.prisma.$queryRaw<ExportRow[]>(Prisma.sql`
          SELECT p."collectedAt" AS "collectedAt", o.number AS "orderNumber",
                 p."amountPoisha" AS "amountPoisha", p."currencyCode"
          FROM payment p JOIN customer_order o ON o.id = p."orderId"
          WHERE p.status = 'COLLECTED' AND p."collectedAt" BETWEEN ${lower} AND ${upper}
          ORDER BY p."collectedAt" ASC, o.number ASC
          OFFSET ${offset} LIMIT ${limit}
        `);
      case ReportExportType.ORDERS:
        return this.prisma.$queryRaw<ExportRow[]>(Prisma.sql`
          SELECT o.number, o.email, o.status::text, o."paymentMethod"::text AS "paymentMethod",
                 o."subtotalPoisha", o."shippingPoisha", o."discountPoisha",
                 o."totalPoisha", o."createdAt"
          FROM customer_order o
          WHERE o."createdAt" BETWEEN ${lower} AND ${upper}
          ORDER BY o."createdAt" ASC, o.number ASC
          OFFSET ${offset} LIMIT ${limit}
        `);
      case ReportExportType.PRODUCTS:
        return this.prisma.$queryRaw<ExportRow[]>(Prisma.sql`
          SELECT i."productId", i.name, i.slug, SUM(i.quantity)::bigint AS units,
                 SUM(i.quantity * i."unitPricePoisha")::bigint AS "revenuePoisha"
          FROM order_item i
          JOIN customer_order o ON o.id = i."orderId"
          JOIN payment p ON p."orderId" = o.id
            AND p.status = 'COLLECTED' AND p."collectedAt" IS NOT NULL
          WHERE p."collectedAt" BETWEEN ${lower} AND ${upper}
          GROUP BY i."productId", i.name, i.slug
          ORDER BY units DESC, i.name ASC
          OFFSET ${offset} LIMIT ${limit}
        `);
      case ReportExportType.CUSTOMERS:
        return this.prisma.$queryRaw<ExportRow[]>(Prisma.sql`
          SELECT u.id, u.email, u."firstName", u."lastName", u."createdAt",
                 COALESCE(m."orderCount", 0) AS "orderCount",
                 COALESCE(m."lifetimeValuePoisha", 0)::bigint AS "lifetimeValuePoisha"
          FROM "User" u LEFT JOIN customer_metric m ON m."userId" = u.id
          WHERE u.role = 'CUSTOMER' AND u."deletedAt" IS NULL
            AND u."createdAt" BETWEEN ${lower} AND ${upper}
          ORDER BY "lifetimeValuePoisha" DESC, u.email ASC
          OFFSET ${offset} LIMIT ${limit}
        `);
      case ReportExportType.INVENTORY:
        return this.prisma.$queryRaw<ExportRow[]>(Prisma.sql`
          SELECT p.name AS product, v.sku, v.size, v.color, l.code AS location,
                 b."onHand", b.reserved, (b."onHand" - b.reserved) AS available,
                 b."lowStockThreshold"
          FROM inventory_balance b
          JOIN product_variant v ON v.id = b."variantId"
          JOIN product p ON p.id = v."productId"
          JOIN inventory_location l ON l.id = b."locationId"
          WHERE v."deletedAt" IS NULL
          ORDER BY p.name ASC, v.sku ASC, l.code ASC
          OFFSET ${offset} LIMIT ${limit}
        `);
    }
  }
}

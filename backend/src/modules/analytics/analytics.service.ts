import { BadRequestException, Injectable } from '@nestjs/common';
import { CustomerMetricsService } from '@/modules/crm/customer-metrics.service';
import { AnalyticsRepository } from './analytics.repository';
import {
  enumerateBuckets,
  percentageDelta,
  resolveDateRange,
} from './analytics.utils';
import { SalesGranularity, type SalesQueryDto } from './dto/analytics-query.dto';

const taka = (poisha: bigint) => Number(poisha) / 100;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly customerMetrics: CustomerMetricsService,
  ) {}

  async overview() {
    const row = await this.repository.overview();
    return {
      totalRevenue: taka(row.total_revenue),
      totalOrders: Number(row.total_orders),
      ordersToday: Number(row.orders_today),
      revenueToday: taka(row.revenue_today),
      revenue7d: taka(row.revenue_7d),
      revenue30d: taka(row.revenue_30d),
      deltas: {
        ordersToday: percentageDelta(row.orders_today, row.orders_previous_day),
        revenueToday: percentageDelta(row.revenue_today, row.revenue_previous_day),
        revenue7d: percentageDelta(row.revenue_7d, row.revenue_previous_7d),
        revenue30d: percentageDelta(row.revenue_30d, row.revenue_previous_30d),
      },
      currencyCode: 'BDT',
    };
  }

  async sales(query: SalesQueryDto) {
    let range: { from: Date; to: Date };
    try {
      range = resolveDateRange(query.from, query.to);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid date range');
    }
    const granularity = query.granularity ?? SalesGranularity.DAY;
    const rows = await this.repository.sales(range.from, range.to, granularity);
    const byBucket = new Map(
      rows.map((row) => [row.bucket.toISOString().slice(0, granularity === 'month' ? 7 : 10), row]),
    );
    return enumerateBuckets(range.from, range.to, granularity).map((bucket) => {
      const key = bucket.toISOString().slice(0, granularity === 'month' ? 7 : 10);
      const row = byBucket.get(key);
      return { bucket: key, revenue: taka(row?.revenue ?? 0n), orders: Number(row?.orders ?? 0n) };
    });
  }

  async bestsellers(limit: number) {
    const rows = await this.repository.bestsellers(limit);
    return rows.map((row) => ({
      productId: row.product_id,
      name: row.name,
      slug: row.slug,
      units: Number(row.units),
      revenue: taka(row.revenue),
    }));
  }

  async customerSummary() {
    const thresholdPoisha = this.customerMetrics.getHighValueThresholdPoisha();
    const result = await this.repository.customerSummary(thresholdPoisha);
    return {
      totalCustomers: result.totalCustomers,
      newCustomers: result.newCustomers,
      highValueCount: result.highValue,
      highValueThreshold: Number(thresholdPoisha) / 100,
      topCustomers: result.topCustomers.map((entry) => ({
        id: entry.user.id,
        email: entry.user.email,
        name: [entry.user.firstName, entry.user.lastName].filter(Boolean).join(' ') || entry.user.email,
        orderCount: entry.orderCount,
        lifetimeValue: taka(entry.lifetimeValuePoisha),
      })),
    };
  }

  async inventory() {
    const result = await this.repository.inventorySummary();
    return {
      lowStockCount: Number(result.counts?.low_stock ?? 0n),
      outOfStockCount: Number(result.counts?.out_of_stock ?? 0n),
      topLowSkus: result.topLowSkus.map((row) => ({
        variantId: row.variant_id,
        sku: row.sku,
        productName: row.product_name,
        available: Number(row.available),
        threshold: Number(row.threshold),
      })),
    };
  }
}

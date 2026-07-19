import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerSegmentKey } from '@/generated/prisma/client';
import { poishaToTaka } from '@/common/utils/money';
import {
  type CustomerActivityResponseDto,
  type CustomerMetricResponseDto,
  type CustomerOrderHistoryDto,
  type CustomerResponseDto,
  type SegmentSummaryResponseDto,
} from './dto/customer-response.dto';
import type {
  ActivityCursorQueryDto,
  CustomerCursorQueryDto,
  ListCustomersQueryDto,
} from './dto/list-customers.query.dto';
import { CrmRepository, type CustomerRecord } from './crm.repository';
import { CustomerMetricsService } from './customer-metrics.service';

@Injectable()
export class CrmService {
  constructor(
    private readonly crm: CrmRepository,
    private readonly metrics: CustomerMetricsService,
  ) {}

  async listCustomers(query: ListCustomersQueryDto) {
    const rows = await this.crm.listCustomers(query);
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    return {
      data: page.map(toCustomerResponse),
      meta: {
        limit: query.limit,
        nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
      },
    };
  }

  async getCustomer(id: string): Promise<CustomerResponseDto> {
    let customer = await this.crm.findCustomer(id);
    if (!customer) throw new NotFoundException('Customer not found');
    if (!customer.customerMetric) {
      await this.metrics.recomputeForUser(id);
      customer = await this.crm.findCustomer(id);
    }
    if (!customer) throw new NotFoundException('Customer not found');
    return toCustomerResponse(customer);
  }

  async listOrders(id: string, query: CustomerCursorQueryDto) {
    await this.metrics.ensureCustomer(id);
    const rows = await this.crm.listOrders(id, query);
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    return {
      data: page.map(
        (order): CustomerOrderHistoryDto => ({
          id: order.id,
          number: order.number,
          status: order.status,
          itemCount: order._count.items,
          total: poishaToTaka(order.totalPoisha),
          createdAt: order.createdAt.toISOString(),
        }),
      ),
      meta: {
        limit: query.limit,
        nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
      },
    };
  }

  async listActivity(id: string, query: ActivityCursorQueryDto) {
    await this.metrics.ensureCustomer(id);
    const rows = await this.crm.listActivity(id, query);
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    return {
      data: page.map(
        (event): CustomerActivityResponseDto => ({
          id: event.id.toString(),
          eventType: event.eventType,
          title: event.title,
          ...(event.href ? { href: event.href } : {}),
          ...(event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata)
            ? { metadata: event.metadata as Record<string, unknown> }
            : {}),
          createdAt: event.createdAt.toISOString(),
        }),
      ),
      meta: {
        limit: query.limit,
        nextCursor: hasMore ? page.at(-1)?.id.toString() ?? null : null,
      },
    };
  }

  async segmentSummary(): Promise<SegmentSummaryResponseDto[]> {
    const rows = await this.crm.segmentSummary();
    return rows.map((row) => ({
      segment: row.segmentKey,
      count: row.count,
    }));
  }
}

function toMetricResponse(record: CustomerRecord): CustomerMetricResponseDto {
  const metric = record.customerMetric;
  return {
    orderCount: metric?.orderCount ?? 0,
    deliveredOrderCount: metric?.deliveredOrderCount ?? 0,
    lifetimeValue: poishaToTaka(metric?.lifetimeValuePoisha ?? 0n),
    averageOrderValue: poishaToTaka(metric?.averageOrderPoisha ?? 0n),
    ...(metric?.lastOrderAt ? { lastOrderAt: metric.lastOrderAt.toISOString() } : {}),
    ...(metric?.firstOrderAt ? { firstOrderAt: metric.firstOrderAt.toISOString() } : {}),
    cancelledOrderCount: metric?.cancelledOrderCount ?? 0,
    returnCount: metric?.returnCount ?? 0,
    wishlistItemCount: metric?.wishlistItemCount ?? 0,
    segment: metric?.segmentKey ?? CustomerSegmentKey.NEW,
  };
}

function toCustomerResponse(record: CustomerRecord): CustomerResponseDto {
  return {
    id: record.id,
    email: record.email,
    phone: record.phone,
    ...(record.firstName ? { firstName: record.firstName } : {}),
    ...(record.lastName ? { lastName: record.lastName } : {}),
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    metrics: toMetricResponse(record),
  };
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomerSegmentKey, Prisma } from '@/generated/prisma/client';
import { CrmRepository } from './crm.repository';

const DAY_MS = 24 * 60 * 60 * 1000;

export type SegmentInput = {
  orderCount: number;
  deliveredOrderCount: number;
  lifetimeValuePoisha: bigint;
  lastOrderAt: Date | null;
};

export function classifyCustomerSegment(
  input: SegmentInput,
  thresholdPoisha: bigint,
  now: Date = new Date(),
): CustomerSegmentKey {
  if (input.lifetimeValuePoisha >= thresholdPoisha) {
    return CustomerSegmentKey.HIGH_VALUE;
  }
  if (input.orderCount === 0) return CustomerSegmentKey.NEW;
  if (input.deliveredOrderCount === 1) return CustomerSegmentKey.ONE_TIME;

  const ageDays = input.lastOrderAt
    ? Math.floor((now.getTime() - input.lastOrderAt.getTime()) / DAY_MS)
    : Number.POSITIVE_INFINITY;
  if (ageDays <= 90) return CustomerSegmentKey.ACTIVE;
  if (ageDays <= 180) return CustomerSegmentKey.AT_RISK;
  return CustomerSegmentKey.DORMANT;
}

@Injectable()
export class CustomerMetricsService {
  constructor(
    private readonly crm: CrmRepository,
    private readonly config: ConfigService,
  ) {}

  getHighValueThresholdPoisha(): bigint {
    return BigInt(this.config.get<number>('CRM_HIGH_VALUE_THRESHOLD_POISHA', 1_000_000));
  }

  async recomputeForUser(userId: string, tx?: Prisma.TransactionClient) {
    const thresholdPoisha = this.getHighValueThresholdPoisha();
    const recompute = async (client: Prisma.TransactionClient) => {
      const aggregate = await this.crm.aggregateMetrics(userId, client);
      const segmentKey = classifyCustomerSegment(
        {
          orderCount: aggregate.orderCount,
          deliveredOrderCount: aggregate.deliveredOrderCount,
          lifetimeValuePoisha: aggregate.lifetimeValuePoisha,
          lastOrderAt:
            aggregate.deliveredOrderCount > 0
              ? aggregate.lastRecognizedOrderAt ?? aggregate.lastOrderAt
              : aggregate.lastOrderAt,
        },
        thresholdPoisha,
      );
      const averageOrderPoisha =
        aggregate.deliveredOrderCount > 0
          ? aggregate.lifetimeValuePoisha / BigInt(aggregate.deliveredOrderCount)
          : 0n;
      // lastRecognizedOrderAt only feeds segment classification; it is not a
      // CustomerMetric column, so it must not reach the Prisma upsert.
      const { lastRecognizedOrderAt: _classificationOnly, ...metricFields } = aggregate;
      const metric = await this.crm.saveMetrics(
        userId,
        { ...metricFields, averageOrderPoisha, segmentKey },
        client,
      );
      await this.crm.replaceSegment(userId, segmentKey, client);
      return metric;
    };

    return tx ? recompute(tx) : this.crm.runTransaction(recompute);
  }

  recordActivity(
    userId: string,
    eventType: string,
    title: string,
    href?: string,
    metadata?: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ) {
    return this.crm.recordActivity(
      {
        userId,
        eventType: eventType.trim(),
        title: title.trim(),
        ...(href ? { href } : {}),
        ...(metadata ? { metadata } : {}),
      },
      tx,
    );
  }

  async ensureCustomer(userId: string): Promise<void> {
    const customer = await this.crm.findCustomer(userId);
    if (!customer) throw new NotFoundException('Customer not found');
  }
}

import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { CustomerSegmentKey } from '@/generated/prisma/client';
import { CrmRepository } from './crm.repository';
import { classifyCustomerSegment, CustomerMetricsService } from './customer-metrics.service';

const DEFAULT_THRESHOLD = 1_000_000n;

describe('CustomerMetricsService', () => {
  const now = new Date('2026-07-19T00:00:00.000Z');

  describe('classifyCustomerSegment', () => {
    it.each([
      ['new', 0, 0, 0n, null, CustomerSegmentKey.NEW],
      ['one-time', 1, 1, 2_000n, new Date('2026-07-18'), CustomerSegmentKey.ONE_TIME],
      ['active', 2, 2, 5_000n, new Date('2026-06-01'), CustomerSegmentKey.ACTIVE],
      ['at-risk', 2, 2, 5_000n, new Date('2026-03-01'), CustomerSegmentKey.AT_RISK],
      ['dormant', 2, 2, 5_000n, new Date('2025-12-01'), CustomerSegmentKey.DORMANT],
      ['high-value', 1, 1, DEFAULT_THRESHOLD, new Date('2025-12-01'), CustomerSegmentKey.HIGH_VALUE],
    ])(
      'classifies %s customers with the default threshold',
      (_label, orderCount, deliveredOrderCount, lifetimeValuePoisha, lastOrderAt, expected) => {
        expect(
          classifyCustomerSegment(
            { orderCount, deliveredOrderCount, lifetimeValuePoisha, lastOrderAt },
            DEFAULT_THRESHOLD,
            now,
          ),
        ).toBe(expected);
      },
    );

    it('uses the supplied threshold for high-value classification', () => {
      expect(
        classifyCustomerSegment(
          {
            orderCount: 2,
            deliveredOrderCount: 2,
            lifetimeValuePoisha: 500_000n,
            lastOrderAt: new Date('2026-07-01'),
          },
          400_000n,
          now,
        ),
      ).toBe(CustomerSegmentKey.HIGH_VALUE);

      expect(
        classifyCustomerSegment(
          {
            orderCount: 2,
            deliveredOrderCount: 2,
            lifetimeValuePoisha: 500_000n,
            lastOrderAt: new Date('2026-07-01'),
          },
          600_000n,
          now,
        ),
      ).toBe(CustomerSegmentKey.ACTIVE);
    });
  });

  it('aggregates totals, computes average, and synchronizes membership', async () => {
    const aggregate = {
      orderCount: 4,
      deliveredOrderCount: 2,
      lifetimeValuePoisha: 700_000n,
      firstOrderAt: new Date('2026-01-01'),
      lastOrderAt: new Date('2026-07-01'),
      cancelledOrderCount: 1,
      returnCount: 1,
      wishlistItemCount: 3,
    };
    const tx = {};
    const repository = {
      runTransaction: jest.fn((callback: (client: object) => unknown) => callback(tx)),
      aggregateMetrics: jest.fn().mockResolvedValue(aggregate),
      saveMetrics: jest.fn().mockImplementation((_id, metric) => metric),
      replaceSegment: jest.fn().mockResolvedValue(undefined),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        CustomerMetricsService,
        { provide: CrmRepository, useValue: repository },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(Number(DEFAULT_THRESHOLD)) },
        },
      ],
    }).compile();

    const service = moduleRef.get(CustomerMetricsService);
    const result = await service.recomputeForUser('customer-id');

    expect(result).toMatchObject({
      averageOrderPoisha: 350_000n,
      segmentKey: CustomerSegmentKey.ACTIVE,
    });
    expect(repository.saveMetrics).toHaveBeenCalledWith(
      'customer-id',
      expect.objectContaining({
        orderCount: 4,
        lifetimeValuePoisha: 700_000n,
        averageOrderPoisha: 350_000n,
      }),
      tx,
    );
    expect(repository.replaceSegment).toHaveBeenCalledWith(
      'customer-id',
      CustomerSegmentKey.ACTIVE,
      tx,
    );
  });
});

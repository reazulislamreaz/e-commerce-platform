import { Injectable, Logger } from '@nestjs/common';
import { CrmRepository } from './crm.repository';
import { CustomerMetricsService } from './customer-metrics.service';

const DEFAULT_BATCH_SIZE = 100;

@Injectable()
export class CrmBackfillService {
  private readonly logger = new Logger(CrmBackfillService.name);

  constructor(
    private readonly crm: CrmRepository,
    private readonly metrics: CustomerMetricsService,
  ) {}

  /** Idempotent batch recompute for customers missing or stale CRM projections. */
  async backfillBatch(batchSize = DEFAULT_BATCH_SIZE): Promise<number> {
    const rows = await this.crm.findCustomersNeedingBackfill(batchSize);
    if (rows.length === 0) return 0;

    let processed = 0;
    for (const { id: userId } of rows) {
      try {
        await this.metrics.recomputeForUser(userId);
        processed += 1;
      } catch (error) {
        this.logger.warn(
          { userId, error: error instanceof Error ? error.message : String(error) },
          'CRM metrics backfill failed for customer',
        );
      }
    }

    if (processed > 0) {
      this.logger.log({ processed, requested: rows.length }, 'CRM metrics backfill batch complete');
    }
    return processed;
  }
}

export { DEFAULT_BATCH_SIZE as CRM_BACKFILL_BATCH_SIZE };

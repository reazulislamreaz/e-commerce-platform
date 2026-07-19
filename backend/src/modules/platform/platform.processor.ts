import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { InventoryMaintenanceService } from '@/modules/inventory/inventory-maintenance.service';
import { CrmBackfillService } from '@/modules/crm/crm-backfill.service';
import { OutboxService } from './outbox.service';
import { PLATFORM_JOB, PLATFORM_QUEUE } from './platform-jobs';
import { RetentionService } from './retention.service';

@Processor(PLATFORM_QUEUE)
export class PlatformProcessor extends WorkerHost {
  private readonly logger = new Logger(PlatformProcessor.name);

  constructor(
    private readonly outbox: OutboxService,
    private readonly retention: RetentionService,
    private readonly inventoryMaintenance: InventoryMaintenanceService,
    private readonly crmBackfill: CrmBackfillService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case PLATFORM_JOB.OUTBOX_RELAY: {
        const processed = await this.outbox.relayPending();
        if (processed > 0) {
          this.logger.debug({ processed }, 'Outbox relay tick');
        }
        return;
      }
      case PLATFORM_JOB.RETENTION_PURGE: {
        await this.retention.purgeExpired();
        return;
      }
      case PLATFORM_JOB.INVENTORY_RELEASE_EXPIRED: {
        await this.inventoryMaintenance.tick();
        return;
      }
      case PLATFORM_JOB.CRM_METRICS_BACKFILL: {
        const processed = await this.crmBackfill.backfillBatch();
        if (processed > 0) {
          this.logger.debug({ processed }, 'CRM metrics backfill tick');
        }
        return;
      }
      default:
        this.logger.warn(`Unhandled platform job: ${job.name}`);
    }
  }
}

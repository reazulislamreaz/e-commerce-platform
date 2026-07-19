import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { PLATFORM_JOB, PLATFORM_QUEUE } from './platform-jobs';

/**
 * Registers idempotent BullMQ repeatable jobs so maintenance work is
 * replica-safe (one worker claim) instead of per-process setInterval timers.
 */
@Injectable()
export class PlatformScheduler implements OnModuleInit {
  private readonly logger = new Logger(PlatformScheduler.name);

  constructor(@InjectQueue(PLATFORM_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.ensureRepeatable(PLATFORM_JOB.OUTBOX_RELAY, 2_000);
    await this.ensureRepeatable(PLATFORM_JOB.RETENTION_PURGE, 60 * 60 * 1000);
    await this.ensureRepeatable(PLATFORM_JOB.INVENTORY_RELEASE_EXPIRED, 5 * 60 * 1000);
    await this.ensureRepeatable(PLATFORM_JOB.CRM_METRICS_BACKFILL, 6 * 60 * 60 * 1000);
    this.logger.log('Platform repeatable jobs registered');
  }

  private async ensureRepeatable(name: string, everyMs: number): Promise<void> {
    await this.queue.add(
      name,
      {},
      {
        jobId: `repeat:${name}`,
        repeat: { every: everyMs },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    );
  }
}

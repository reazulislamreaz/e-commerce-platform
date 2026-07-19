import { Global, Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EMAIL_QUEUE } from '@/modules/mail/mail.types';
import { CrmModule } from '@/modules/crm/crm.module';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { AuditService } from './audit.service';
import { IdempotencyService } from './idempotency.service';
import { OutboxService } from './outbox.service';
import { PLATFORM_QUEUE } from './platform-jobs';
import { PlatformProcessor } from './platform.processor';
import { PlatformScheduler } from './platform.scheduler';
import { RetentionService } from './retention.service';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({ name: EMAIL_QUEUE }, { name: PLATFORM_QUEUE }),
    forwardRef(() => InventoryModule),
    forwardRef(() => CrmModule),
  ],
  providers: [
    IdempotencyService,
    OutboxService,
    AuditService,
    RetentionService,
    PlatformScheduler,
    PlatformProcessor,
  ],
  exports: [IdempotencyService, OutboxService, AuditService, RetentionService],
})
export class PlatformModule {}

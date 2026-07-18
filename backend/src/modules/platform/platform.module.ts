import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EMAIL_QUEUE } from '@/modules/mail/mail.types';
import { AuditService } from './audit.service';
import { IdempotencyService } from './idempotency.service';
import { OutboxService } from './outbox.service';
import { RetentionService } from './retention.service';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: EMAIL_QUEUE })],
  providers: [IdempotencyService, OutboxService, AuditService, RetentionService],
  exports: [IdempotencyService, OutboxService, AuditService, RetentionService],
})
export class PlatformModule {}

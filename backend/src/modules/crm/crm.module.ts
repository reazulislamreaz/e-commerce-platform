import { Module } from '@nestjs/common';
import { CrmBackfillService } from './crm-backfill.service';
import { CrmController } from './crm.controller';
import { CrmRepository } from './crm.repository';
import { CrmService } from './crm.service';
import { CustomerMetricsService } from './customer-metrics.service';

@Module({
  controllers: [CrmController],
  providers: [CrmRepository, CrmService, CustomerMetricsService, CrmBackfillService],
  exports: [CustomerMetricsService, CrmBackfillService],
})
export class CrmModule {}

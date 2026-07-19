import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CrmModule } from '@/modules/crm/crm.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsService } from './analytics.service';
import { ReportsController } from './reports.controller';
import { ReportsProcessor } from './reports.processor';
import { ReportsRepository } from './reports.repository';
import { REPORTS_QUEUE, ReportsService } from './reports.service';

@Module({
  imports: [BullModule.registerQueue({ name: REPORTS_QUEUE }), CrmModule],
  controllers: [AnalyticsController, ReportsController],
  providers: [
    AnalyticsRepository,
    AnalyticsService,
    ReportsRepository,
    ReportsService,
    ReportsProcessor,
  ],
})
export class AnalyticsModule {}

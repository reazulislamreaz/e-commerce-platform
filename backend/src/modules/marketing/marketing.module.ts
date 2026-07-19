import { Module } from '@nestjs/common';
import { MarketingController } from './marketing.controller';
import { MarketingRepository } from './marketing.repository';
import { MarketingService } from './marketing.service';

@Module({
  controllers: [MarketingController],
  providers: [MarketingRepository, MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}

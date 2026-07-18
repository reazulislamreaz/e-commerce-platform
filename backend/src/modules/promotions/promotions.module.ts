import { Module } from '@nestjs/common';
import { AdminCouponsController } from './admin-coupons.controller';
import { PromotionsController } from './promotions.controller';
import { PromotionsRepository } from './promotions.repository';
import { PromotionsService } from './promotions.service';

@Module({
  controllers: [PromotionsController, AdminCouponsController],
  providers: [PromotionsRepository, PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}

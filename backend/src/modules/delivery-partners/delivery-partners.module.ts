import { Module } from '@nestjs/common';
import { DeliveryPartnersController } from './delivery-partners.controller';
import { DeliveryPartnersRepository } from './delivery-partners.repository';
import { DeliveryPartnersService } from './delivery-partners.service';

@Module({
  controllers: [DeliveryPartnersController],
  providers: [DeliveryPartnersRepository, DeliveryPartnersService],
  exports: [DeliveryPartnersService],
})
export class DeliveryPartnersModule {}

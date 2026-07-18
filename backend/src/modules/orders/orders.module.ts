import { Module } from '@nestjs/common';
import { CartModule } from '@/modules/cart/cart.module';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { PromotionsModule } from '@/modules/promotions/promotions.module';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

@Module({
  imports: [InventoryModule, PromotionsModule, CartModule, NotificationsModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersRepository, OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

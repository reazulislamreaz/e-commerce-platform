import { Module, forwardRef } from '@nestjs/common';
import { CartModule } from '@/modules/cart/cart.module';
import { CrmModule } from '@/modules/crm/crm.module';
import { DeliveryPartnersModule } from '@/modules/delivery-partners/delivery-partners.module';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { PromotionsModule } from '@/modules/promotions/promotions.module';
import { AdminOrdersController } from './admin-orders.controller';
import { InvoicePdfService } from './invoice-pdf.service';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    forwardRef(() => InventoryModule),
    PromotionsModule,
    forwardRef(() => CartModule),
    NotificationsModule,
    CrmModule,
    DeliveryPartnersModule,
  ],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersRepository, OrdersService, InvoicePdfService],
  exports: [OrdersService],
})
export class OrdersModule {}

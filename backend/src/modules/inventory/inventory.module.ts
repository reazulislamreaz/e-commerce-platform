import { Module, forwardRef } from '@nestjs/common';
import { OrdersModule } from '@/modules/orders/orders.module';
import { InventoryMaintenanceService } from './inventory-maintenance.service';
import { InventoryRepository } from './inventory.repository';
import { InventoryService } from './inventory.service';

/**
 * Inventory availability is embedded in catalog responses. Checkout, returns,
 * and admin adjustments consume InventoryService transactionally. Expired
 * reservation release is scheduled via the platform BullMQ worker.
 */
@Module({
  imports: [forwardRef(() => OrdersModule)],
  providers: [InventoryRepository, InventoryService, InventoryMaintenanceService],
  exports: [InventoryService, InventoryMaintenanceService],
})
export class InventoryModule {}

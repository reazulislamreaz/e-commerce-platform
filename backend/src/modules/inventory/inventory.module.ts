import { Module } from '@nestjs/common';
import { InventoryRepository } from './inventory.repository';
import { InventoryService } from './inventory.service';

/**
 * Inventory is intentionally internal in Milestone 2: storefront availability
 * is embedded in catalog responses. Admin mutation endpoints ship only with an
 * admin workflow; checkout will consume this service transactionally.
 */
@Module({
  providers: [InventoryRepository, InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

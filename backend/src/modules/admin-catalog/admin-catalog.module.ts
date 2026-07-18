import { Module } from '@nestjs/common';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { AdminCatalogController } from './admin-catalog.controller';
import { AdminInventoryController } from './admin-inventory.controller';
import { AdminCatalogRepository } from './admin-catalog.repository';
import { AdminCatalogService } from './admin-catalog.service';

@Module({
  imports: [InventoryModule],
  controllers: [AdminCatalogController, AdminInventoryController],
  providers: [AdminCatalogRepository, AdminCatalogService],
  exports: [AdminCatalogService],
})
export class AdminCatalogModule {}

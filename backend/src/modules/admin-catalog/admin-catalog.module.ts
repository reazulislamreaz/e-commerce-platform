import { Module } from '@nestjs/common';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { CatalogModule } from '@/modules/catalog/catalog.module';
import { AdminCatalogController } from './admin-catalog.controller';
import { AdminInventoryController } from './admin-inventory.controller';
import { AdminCatalogRepository } from './admin-catalog.repository';
import { AdminCatalogService } from './admin-catalog.service';
import { ProductImageStorageService } from './product-image-storage.service';

@Module({
  imports: [InventoryModule, CatalogModule],
  controllers: [AdminCatalogController, AdminInventoryController],
  providers: [AdminCatalogRepository, AdminCatalogService, ProductImageStorageService],
  exports: [AdminCatalogService],
})
export class AdminCatalogModule {}

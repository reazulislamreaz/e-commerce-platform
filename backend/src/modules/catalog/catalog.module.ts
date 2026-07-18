import { Module } from '@nestjs/common';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { CatalogController, TaxonomyController } from './catalog.controller';
import { CatalogRepository } from './catalog.repository';
import { CatalogService } from './catalog.service';

@Module({
  imports: [InventoryModule],
  controllers: [CatalogController, TaxonomyController],
  providers: [CatalogRepository, CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}

import { Module } from '@nestjs/common';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { AdminReturnsController } from './admin-returns.controller';
import { ReturnsController } from './returns.controller';
import { ReturnsRepository } from './returns.repository';
import { ReturnsService } from './returns.service';

@Module({
  imports: [InventoryModule, NotificationsModule],
  controllers: [ReturnsController, AdminReturnsController],
  providers: [ReturnsRepository, ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}

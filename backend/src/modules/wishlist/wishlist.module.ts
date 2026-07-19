import { Module } from '@nestjs/common';
import { CrmModule } from '@/modules/crm/crm.module';
import { WishlistController } from './wishlist.controller';
import { WishlistRepository } from './wishlist.repository';
import { WishlistService } from './wishlist.service';

@Module({
  imports: [CrmModule],
  controllers: [WishlistController],
  providers: [WishlistRepository, WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}

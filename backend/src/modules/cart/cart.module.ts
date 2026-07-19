import { Module, forwardRef } from '@nestjs/common';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { CartRecoveryModule } from '@/modules/cart-recovery/cart-recovery.module';
import { CartController } from './cart.controller';
import { CartRepository } from './cart.repository';
import { CartService } from './cart.service';

// InventoryModule participates in the Cart -> Inventory -> Orders -> Cart cycle.
@Module({
  imports: [forwardRef(() => InventoryModule), CartRecoveryModule],
  controllers: [CartController],
  providers: [CartRepository, CartService],
  exports: [CartService],
})
export class CartModule {}

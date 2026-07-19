import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MailModule } from '@/modules/mail/mail.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { CartRecoveryProcessor } from './cart-recovery.processor';
import { CartRecoveryService } from './cart-recovery.service';
import { CART_RECOVERY_QUEUE } from './cart-recovery.types';

@Module({
  imports: [
    BullModule.registerQueue({ name: CART_RECOVERY_QUEUE }),
    MailModule,
    NotificationsModule,
  ],
  providers: [CartRecoveryService, CartRecoveryProcessor],
  exports: [CartRecoveryService],
})
export class CartRecoveryModule {}

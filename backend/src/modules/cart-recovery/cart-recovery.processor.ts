import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CartRecoveryStatus, NotificationType } from '@/generated/prisma/client';
import { MailService } from '@/modules/mail/mail.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import type { Job } from 'bullmq';
import { CartRecoveryService } from './cart-recovery.service';
import {
  CART_IDLE_MS,
  CART_RECOVERY_JOB,
  CART_RECOVERY_QUEUE,
  CART_RECOVERY_SCAN_JOB,
  MAX_CART_REMINDERS,
  SECOND_REMINDER_DELAY_MS,
  type CartRecoveryJob,
} from './cart-recovery.types';

@Injectable()
@Processor(CART_RECOVERY_QUEUE)
export class CartRecoveryProcessor extends WorkerHost {
  private readonly logger = new Logger(CartRecoveryProcessor.name);
  private readonly frontendOrigin: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    private readonly recoveryService: CartRecoveryService,
    config: ConfigService,
  ) {
    super();
    this.frontendOrigin = config.getOrThrow<string>('FRONTEND_ORIGIN').replace(/\/$/, '');
  }

  async process(job: Job<CartRecoveryJob | Record<string, never>>): Promise<void> {
    if (job.name === CART_RECOVERY_SCAN_JOB) {
      const scheduled = await this.recoveryService.scan();
      if (scheduled > 0) {
        this.logger.log({ scheduled }, 'Abandoned-cart reminders scheduled');
      }
      return;
    }

    if (job.name !== CART_RECOVERY_JOB) return;
    const data = job.data as CartRecoveryJob;
    const recovery = await this.prisma.abandonedCartRecovery.findUnique({
      where: { id: data.recoveryId },
      include: {
        cart: { select: { updatedAt: true, items: { select: { id: true }, take: 1 } } },
        user: {
          select: {
            firstName: true,
            preference: { select: { emailMarketing: true } },
          },
        },
      },
    });
    if (
      !recovery ||
      (recovery.status !== CartRecoveryStatus.PENDING &&
        recovery.status !== CartRecoveryStatus.SENT) ||
      recovery.reminderCount >= MAX_CART_REMINDERS
    ) {
      return;
    }

    const now = new Date();
    if (
      recovery.cart.items.length === 0 ||
      recovery.cart.updatedAt.getTime() > now.getTime() - CART_IDLE_MS
    ) {
      await this.prisma.abandonedCartRecovery.update({
        where: { id: recovery.id },
        data: { status: CartRecoveryStatus.SUPPRESSED, suppressedAt: now },
      });
      return;
    }

    // Guests opt in via recovery email capture; members require explicit marketing opt-in.
    if (recovery.userId && recovery.user?.preference?.emailMarketing !== true) {
      await this.prisma.abandonedCartRecovery.update({
        where: { id: recovery.id },
        data: { status: CartRecoveryStatus.SUPPRESSED, suppressedAt: now },
      });
      return;
    }

    const reminderCount = recovery.reminderCount + 1;
    await this.mail.sendAbandonedCart(
      {
        to: recovery.email,
        firstName: recovery.user?.firstName ?? '',
        cartUrl: `${this.frontendOrigin}/cart`,
        items: readSnapshotItems(recovery.cartSnapshot),
      },
      { jobId: `abandoned-cart:${recovery.id}:${reminderCount}` },
    );

    await this.prisma.abandonedCartRecovery.update({
      where: { id: recovery.id },
      data: {
        status: CartRecoveryStatus.SENT,
        reminderCount,
        lastSentAt: now,
        nextSendAt: new Date(now.getTime() + SECOND_REMINDER_DELAY_MS),
      },
    });

    if (recovery.userId) {
      await this.notifications.createForUser({
        userId: recovery.userId,
        type: NotificationType.ABANDONED_CART,
        title: 'Your bag is waiting',
        body: 'The pieces in your bag are still available. Complete your order while stock lasts.',
        href: '/cart',
        dedupeKey: `cart-recovery:${recovery.id}:${reminderCount}`,
      });
    }
  }
}

function readSnapshotItems(value: unknown): Array<{ name: string; quantity: number }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (
      typeof item === 'object' &&
      item !== null &&
      typeof (item as { name?: unknown }).name === 'string' &&
      typeof (item as { quantity?: unknown }).quantity === 'number'
    ) {
      return [
        {
          name: (item as { name: string }).name,
          quantity: (item as { quantity: number }).quantity,
        },
      ];
    }
    return [];
  });
}

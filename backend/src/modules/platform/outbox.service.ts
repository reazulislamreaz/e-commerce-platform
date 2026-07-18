import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OutboxStatus, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { EMAIL_QUEUE, EmailJobName } from '@/modules/mail/mail.types';

export const OUTBOX_EVENT = {
  ORDER_CONFIRMATION_EMAIL: 'order.confirmation.email',
  ORDER_STATUS_EMAIL: 'order.status.email',
  CONTACT_ACK_EMAIL: 'contact.ack.email',
  CONTACT_INTERNAL_EMAIL: 'contact.internal.email',
  NEWSLETTER_WELCOME_EMAIL: 'newsletter.welcome.email',
} as const;

@Injectable()
export class OutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.relayPending().catch((error: unknown) => {
        this.logger.error({ err: error }, 'Outbox relay failed');
      });
    }, 2_000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async enqueue(
    eventType: string,
    aggregateId: string,
    payload: Record<string, unknown>,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        eventType,
        aggregateId,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }

  async relayPending(limit = 50): Promise<number> {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        status: OutboxStatus.PENDING,
        availableAt: { lte: new Date() },
      },
      orderBy: { id: 'asc' },
      take: limit,
    });

    let processed = 0;
    for (const event of events) {
      try {
        await this.dispatch(event.eventType, event.payload as Record<string, unknown>);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: OutboxStatus.PROCESSED,
            processedAt: new Date(),
            attempts: { increment: 1 },
          },
        });
        processed += 1;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown outbox error';
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: event.attempts + 1 >= 10 ? OutboxStatus.FAILED : OutboxStatus.PENDING,
            attempts: { increment: 1 },
            lastError: message.slice(0, 500),
            availableAt: new Date(Date.now() + Math.min(60_000, 2 ** event.attempts * 1_000)),
          },
        });
      }
    }
    return processed;
  }

  private async dispatch(eventType: string, payload: Record<string, unknown>): Promise<void> {
    switch (eventType) {
      case OUTBOX_EVENT.ORDER_CONFIRMATION_EMAIL:
        await this.emailQueue.add(EmailJobName.ORDER_CONFIRMATION, payload);
        return;
      case OUTBOX_EVENT.ORDER_STATUS_EMAIL:
        await this.emailQueue.add(EmailJobName.ORDER_STATUS, payload);
        return;
      case OUTBOX_EVENT.CONTACT_ACK_EMAIL:
        await this.emailQueue.add(EmailJobName.CONTACT_ACK, payload);
        return;
      case OUTBOX_EVENT.CONTACT_INTERNAL_EMAIL:
        await this.emailQueue.add(EmailJobName.CONTACT_INTERNAL, payload);
        return;
      case OUTBOX_EVENT.NEWSLETTER_WELCOME_EMAIL:
        await this.emailQueue.add(EmailJobName.NEWSLETTER_WELCOME, payload);
        return;
      default:
        this.logger.warn(`Unhandled outbox event type: ${eventType}`);
    }
  }
}

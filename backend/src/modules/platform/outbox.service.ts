import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OutboxStatus, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { EMAIL_JOB_OPTIONS, EMAIL_QUEUE, EmailJobName } from '@/modules/mail/mail.types';

export const OUTBOX_EVENT = {
  ORDER_CONFIRMATION_EMAIL: 'order.confirmation.email',
  ORDER_STATUS_EMAIL: 'order.status.email',
  SHIPPING_UPDATE_EMAIL: 'order.shipping.email',
  DELIVERED_EMAIL: 'order.delivered.email',
  PAYMENT_CONFIRMATION_EMAIL: 'order.payment.email',
  RETURN_STATUS_EMAIL: 'return.status.email',
  CONTACT_ACK_EMAIL: 'contact.ack.email',
  CONTACT_INTERNAL_EMAIL: 'contact.internal.email',
  NEWSLETTER_WELCOME_EMAIL: 'newsletter.welcome.email',
  WELCOME_EMAIL: 'auth.welcome.email',
} as const;

type ClaimedOutboxRow = {
  id: bigint;
  eventType: string;
  payload: Prisma.JsonValue;
  attempts: number;
};

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
  ) {}

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

  /**
   * Claims pending outbox rows with SKIP LOCKED and marks them PROCESSING
   * so multiple API replicas cannot double-dispatch the same event.
   */
  async relayPending(limit = 50): Promise<number> {
    const events = await this.prisma.$transaction(async (tx) => {
      return tx.$queryRaw<ClaimedOutboxRow[]>`
        WITH claimed AS (
          SELECT id
          FROM outbox_event
          WHERE status = 'PENDING'::"OutboxStatus"
            AND "availableAt" <= NOW()
          ORDER BY id ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        )
        UPDATE outbox_event AS e
        SET status = 'PROCESSING'::"OutboxStatus",
            attempts = e.attempts + 1
        FROM claimed
        WHERE e.id = claimed.id
        RETURNING e.id, e."eventType", e.payload, e.attempts
      `;
    });

    let processed = 0;
    for (const event of events) {
      try {
        await this.dispatch(event.eventType, event.payload as Record<string, unknown>, event.id);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: OutboxStatus.PROCESSED,
            processedAt: new Date(),
            lastError: null,
          },
        });
        processed += 1;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown outbox error';
        // BullMQ rejects duplicate jobIds when a prior attempt already queued the email;
        // treat that as success so the outbox row is not retried forever.
        if (message.includes('Job') && message.includes('already exists')) {
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: OutboxStatus.PROCESSED,
              processedAt: new Date(),
              lastError: null,
            },
          });
          processed += 1;
          continue;
        }
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: event.attempts >= 10 ? OutboxStatus.FAILED : OutboxStatus.PENDING,
            lastError: message.slice(0, 500),
            availableAt: new Date(
              Date.now() + Math.min(60_000, 2 ** Math.max(0, event.attempts - 1) * 1_000),
            ),
          },
        });
        this.logger.warn({ err: error, eventId: event.id.toString() }, 'Outbox dispatch failed');
      }
    }
    return processed;
  }

  private async dispatch(
    eventType: string,
    payload: Record<string, unknown>,
    eventId: bigint,
  ): Promise<void> {
    const options = {
      ...EMAIL_JOB_OPTIONS,
      jobId: `outbox:${eventId.toString()}`,
    };
    switch (eventType) {
      case OUTBOX_EVENT.ORDER_CONFIRMATION_EMAIL:
        await this.emailQueue.add(EmailJobName.ORDER_CONFIRMATION, payload, options);
        return;
      case OUTBOX_EVENT.ORDER_STATUS_EMAIL:
        await this.emailQueue.add(EmailJobName.ORDER_STATUS, payload, options);
        return;
      case OUTBOX_EVENT.SHIPPING_UPDATE_EMAIL:
        await this.emailQueue.add(EmailJobName.SHIPPING_UPDATE, payload, options);
        return;
      case OUTBOX_EVENT.DELIVERED_EMAIL:
        await this.emailQueue.add(EmailJobName.DELIVERED, payload, options);
        return;
      case OUTBOX_EVENT.PAYMENT_CONFIRMATION_EMAIL:
        await this.emailQueue.add(EmailJobName.PAYMENT_CONFIRMATION, payload, options);
        return;
      case OUTBOX_EVENT.RETURN_STATUS_EMAIL:
        await this.emailQueue.add(EmailJobName.RETURN_STATUS, payload, options);
        return;
      case OUTBOX_EVENT.CONTACT_ACK_EMAIL:
        await this.emailQueue.add(EmailJobName.CONTACT_ACK, payload, options);
        return;
      case OUTBOX_EVENT.CONTACT_INTERNAL_EMAIL:
        await this.emailQueue.add(EmailJobName.CONTACT_INTERNAL, payload, options);
        return;
      case OUTBOX_EVENT.NEWSLETTER_WELCOME_EMAIL:
        await this.emailQueue.add(EmailJobName.NEWSLETTER_WELCOME, payload, options);
        return;
      case OUTBOX_EVENT.WELCOME_EMAIL:
        await this.emailQueue.add(EmailJobName.WELCOME, payload, options);
        return;
      default:
        throw new Error(`Unhandled outbox event type: ${eventType}`);
    }
  }
}

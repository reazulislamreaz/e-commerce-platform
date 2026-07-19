import { Injectable } from '@nestjs/common';
import {
  NotificationDeliveryStatus,
  NotificationType,
  Prisma,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export type NotificationRecord = Prisma.NotificationGetPayload<object>;

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByUserId(
    userId: string,
    query: { cursor?: string; limit: number; unreadOnly?: boolean },
  ): Promise<NotificationRecord[]> {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(query.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
  }

  countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  findOwnedById(userId: string, id: string): Promise<NotificationRecord | null> {
    return this.prisma.notification.findFirst({
      where: { id, userId },
    });
  }

  findByDedupeKey(
    userId: string,
    dedupeKey: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<NotificationRecord | null> {
    return tx.notification.findFirst({
      where: { userId, dedupeKey },
    });
  }

  getInAppPreference(
    userId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<{ inAppEnabled: boolean } | null> {
    return tx.userPreference.findUnique({
      where: { userId },
      select: { inAppEnabled: true },
    });
  }

  create(
    data: {
      userId: string;
      type: NotificationType;
      title: string;
      body: string;
      href?: string | null;
      dedupeKey?: string | null;
      payload?: Prisma.InputJsonValue;
    },
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<NotificationRecord> {
    return tx.notification.create({ data });
  }

  createInAppDelivery(
    notificationId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    return tx.notificationDelivery
      .create({
        data: {
          notificationId,
          channel: 'in_app',
          status: NotificationDeliveryStatus.SENT,
          attemptedAt: new Date(),
        },
      })
      .then(() => undefined);
  }

  createEmailDelivery(
    notificationId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    return tx.notificationDelivery
      .create({
        data: {
          notificationId,
          channel: 'email',
          status: NotificationDeliveryStatus.PENDING,
        },
      })
      .then(() => undefined);
  }

  markRead(id: string, tx: Prisma.TransactionClient = this.prisma): Promise<NotificationRecord> {
    return tx.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  markAllRead(userId: string, tx: Prisma.TransactionClient = this.prisma): Promise<number> {
    return tx.notification
      .updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      })
      .then((result) => result.count);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@/generated/prisma/client';
import type { ListNotificationsQueryDto } from './dto/list-notifications.query.dto';
import type { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationsRepository, type NotificationRecord } from './notifications.repository';

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  dedupeKey?: string;
  payload?: Record<string, unknown>;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly notifications: NotificationsRepository) {}

  async list(userId: string, query: ListNotificationsQueryDto) {
    const rows = await this.notifications.listByUserId(userId, query);
    return toCursorPage(rows, query.limit);
  }

  async unreadCount(userId: string) {
    const count = await this.notifications.countUnread(userId);
    return { count };
  }

  async markRead(userId: string, id: string): Promise<NotificationResponseDto> {
    const existing = await this.notifications.findOwnedById(userId, id);
    if (!existing) throw new NotFoundException('Notification not found');
    if (existing.readAt) return toResponse(existing);

    const updated = await this.notifications.markRead(id);
    return toResponse(updated);
  }

  async markAllRead(userId: string) {
    const updated = await this.notifications.markAllRead(userId);
    return { updated };
  }

  async createForUser(
    input: CreateNotificationInput,
    tx?: Prisma.TransactionClient,
  ): Promise<NotificationRecord | null> {
    const href = sanitizeHref(input.href);
    const preference = await this.notifications.getInAppPreference(input.userId, tx);
    if (preference?.inAppEnabled === false) return null;

    if (input.dedupeKey) {
      const existing = await this.notifications.findByDedupeKey(
        input.userId,
        input.dedupeKey,
        tx,
      );
      if (existing) return existing;
    }

    const created = await this.notifications.create(
      {
        userId: input.userId,
        type: input.type,
        title: input.title.trim(),
        body: input.body.trim(),
        href: href ?? null,
        dedupeKey: input.dedupeKey ?? null,
        payload: (input.payload ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
      tx,
    );
    await this.notifications.createInAppDelivery(created.id, tx);
    return created;
  }

  createEmailDelivery(
    notificationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    return this.notifications.createEmailDelivery(notificationId, tx);
  }
}

export function sanitizeHref(href?: string): string | undefined {
  if (!href) return undefined;
  const trimmed = href.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return undefined;
  return trimmed;
}

function toResponse(row: NotificationRecord): NotificationResponseDto {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    read: row.readAt != null,
    ...(row.href ? { href: row.href } : {}),
  };
}

function toCursorPage(rows: NotificationRecord[], limit: number) {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    data: page.map(toResponse),
    meta: {
      limit,
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    },
  };
}

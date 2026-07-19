import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NotificationType } from '@/generated/prisma/client';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService, sanitizeHref } from './notifications.service';

const userId = '11111111-1111-4111-8111-111111111111';
const notificationId = '22222222-2222-4222-8222-222222222222';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const repository = {
    listByUserId: jest.fn(),
    countUnread: jest.fn(),
    findOwnedById: jest.fn(),
    findByDedupeKey: jest.fn(),
    getInAppPreference: jest.fn(),
    create: jest.fn(),
    createInAppDelivery: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationsRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(NotificationsService);
  });

  describe('sanitizeHref', () => {
    it('accepts relative paths', () => {
      expect(sanitizeHref('/account/orders')).toBe('/account/orders');
    });

    it('rejects protocol-relative and absolute URLs', () => {
      expect(sanitizeHref('//evil.example')).toBeUndefined();
      expect(sanitizeHref('https://evil.example')).toBeUndefined();
    });
  });

  it('returns unread count', async () => {
    repository.countUnread.mockResolvedValue(4);
    await expect(service.unreadCount(userId)).resolves.toEqual({ count: 4 });
  });

  it('marks an owned notification as read', async () => {
    const unread = {
      id: notificationId,
      title: 'Hello',
      body: 'World',
      href: '/account',
      readAt: null,
      createdAt: new Date('2026-01-01'),
    };
    repository.findOwnedById.mockResolvedValue(unread);
    repository.markRead.mockResolvedValue({ ...unread, readAt: new Date('2026-01-02') });

    await expect(service.markRead(userId, notificationId)).resolves.toMatchObject({
      id: notificationId,
      read: true,
    });
  });

  it('throws when notification is missing', async () => {
    repository.findOwnedById.mockResolvedValue(null);
    await expect(service.markRead(userId, notificationId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('dedupes by dedupeKey', async () => {
    const existing = { id: notificationId };
    repository.findByDedupeKey.mockResolvedValue(existing);

    await expect(
      service.createForUser({
        userId,
        type: NotificationType.WELCOME,
        title: 'Welcome',
        body: 'Welcome aboard',
        dedupeKey: 'welcome',
      }),
    ).resolves.toBe(existing);

    expect(repository.create).not.toHaveBeenCalled();
  });
});

import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NewsletterStatus } from '@/generated/prisma/client';
import { AuditService } from '@/modules/platform/audit.service';
import { OutboxService } from '@/modules/platform/outbox.service';
import { NewsletterRepository } from './newsletter.repository';
import { NewsletterService } from './newsletter.service';

describe('NewsletterService', () => {
  let service: NewsletterService;
  const repository = {
    runTransaction: jest.fn(),
    upsertActive: jest.fn(),
    findByTokenHash: jest.fn(),
    findById: jest.fn(),
    markUnsubscribed: jest.fn(),
    listAdmin: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.runTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = { consentEvent: { create: jest.fn() } };
      return fn(tx);
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        NewsletterService,
        { provide: NewsletterRepository, useValue: repository },
        { provide: OutboxService, useValue: { enqueue: jest.fn() } },
        { provide: AuditService, useValue: { write: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn(() => 'http://localhost:3000') },
        },
      ],
    }).compile();

    service = moduleRef.get(NewsletterService);
  });

  it('subscribes with consent and enqueues welcome email', async () => {
    repository.upsertActive.mockResolvedValue({ id: 'sub-1', email: 'user@example.com' });

    await expect(
      service.subscribe({ email: 'user@example.com', consent: true }, undefined, {}),
    ).resolves.toEqual({ message: 'You are subscribed to Elevate Apparel updates.' });

    expect(repository.upsertActive).toHaveBeenCalled();
  });

  it('always returns success on unsubscribe', async () => {
    repository.findByTokenHash.mockResolvedValue(null);

    await expect(service.unsubscribe('bad-token')).resolves.toEqual({
      message: 'You have been unsubscribed.',
    });
  });

  it('unsubscribes active token matches', async () => {
    repository.findByTokenHash.mockResolvedValue({
      id: 'sub-1',
      email: 'user@example.com',
      userId: null,
      status: NewsletterStatus.ACTIVE,
    });
    repository.markUnsubscribed.mockResolvedValue({
      id: 'sub-1',
      status: NewsletterStatus.UNSUBSCRIBED,
    });

    await expect(service.unsubscribe('valid-token')).resolves.toEqual({
      message: 'You have been unsubscribed.',
    });
    expect(repository.markUnsubscribed).toHaveBeenCalledWith('sub-1', expect.anything());
  });
});

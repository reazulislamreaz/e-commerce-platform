import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '@/modules/platform/audit.service';
import { OutboxService } from '@/modules/platform/outbox.service';
import { ContactRepository } from './contact.repository';
import { ContactService } from './contact.service';

describe('ContactService', () => {
  let service: ContactService;
  const repository = {
    runTransaction: jest.fn(),
    create: jest.fn(),
    listAdmin: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.runTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        consentEvent: { create: jest.fn() },
      };
      return fn(tx);
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: ContactRepository, useValue: repository },
        { provide: OutboxService, useValue: { enqueue: jest.fn() } },
        { provide: AuditService, useValue: { write: jest.fn() } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => (key === 'MAIL_FROM' ? 'support@example.com' : undefined)),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(ContactService);
  });

  it('returns fake success when honeypot is filled', async () => {
    await expect(
      service.submit(
        {
          name: 'Bot',
          email: 'bot@example.com',
          subject: 'Spam',
          message: 'Buy now',
          website: 'http://spam.example',
        },
        undefined,
        {},
      ),
    ).resolves.toEqual({
      message: 'Thank you for contacting us. We will respond shortly.',
    });
    expect(repository.runTransaction).not.toHaveBeenCalled();
  });

  it('persists a valid contact submission', async () => {
    repository.create.mockResolvedValue({ id: 'msg-1' });

    await expect(
      service.submit(
        {
          name: 'Rahim',
          email: 'rahim@example.com',
          subject: 'Sizing',
          message: 'Need help with sizing',
        },
        undefined,
        { ip: '127.0.0.1' },
      ),
    ).resolves.toMatchObject({
      message: 'Thank you for contacting us. We will respond shortly.',
    });

    expect(repository.create).toHaveBeenCalled();
  });
});

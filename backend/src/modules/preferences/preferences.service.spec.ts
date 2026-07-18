import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConsentAction, ConsentPurpose } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { PreferencesRepository } from './preferences.repository';
import { PreferencesService } from './preferences.service';

const userId = '11111111-1111-4111-8111-111111111111';

describe('PreferencesService', () => {
  let service: PreferencesService;
  const repository = {
    upsertDefaults: jest.fn(),
    update: jest.fn(),
    runTransaction: jest.fn(),
  };
  const prisma = {
    user: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.runTransaction.mockImplementation(
      async <T>(fn: (tx: unknown) => Promise<T>) => fn({}),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        PreferencesService,
        { provide: PreferencesRepository, useValue: repository },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(PreferencesService);
  });

  it('returns defaults on first GET', async () => {
    repository.upsertDefaults.mockResolvedValue({
      emailOrderUpdates: true,
      emailMarketing: false,
      inAppEnabled: true,
    });

    await expect(service.getMine(userId)).resolves.toEqual({
      emailOrderUpdates: true,
      emailMarketing: false,
      inAppEnabled: true,
    });
  });

  it('records consent when email marketing is toggled', async () => {
    repository.upsertDefaults.mockResolvedValue({
      emailOrderUpdates: true,
      emailMarketing: false,
      inAppEnabled: true,
    });
    prisma.user.findUnique.mockResolvedValue({ email: 'user@example.com' });
    repository.update.mockResolvedValue({
      emailOrderUpdates: true,
      emailMarketing: true,
      inAppEnabled: true,
    });

    const tx = {
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'user@example.com' }) },
      consentEvent: { create: jest.fn() },
    };
    repository.runTransaction.mockImplementation(async (fn) => fn(tx));

    await service.updateMine(userId, { emailMarketing: true });

    expect(tx.consentEvent.create).toHaveBeenCalledWith({
      data: {
        userId,
        email: 'user@example.com',
        purpose: ConsentPurpose.MARKETING_EMAIL,
        action: ConsentAction.GRANTED,
        source: 'preferences_api',
      },
    });
  });

  it('throws when user is missing during marketing toggle', async () => {
    repository.upsertDefaults.mockResolvedValue({
      emailOrderUpdates: true,
      emailMarketing: false,
      inAppEnabled: true,
    });
    const tx = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      consentEvent: { create: jest.fn() },
    };
    repository.runTransaction.mockImplementation(async (fn) => fn(tx));

    await expect(service.updateMine(userId, { emailMarketing: true })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

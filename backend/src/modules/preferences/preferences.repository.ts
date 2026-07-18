import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export type PreferenceRecord = Prisma.UserPreferenceGetPayload<object>;

const defaultPreferenceData = {
  emailOrderUpdates: true,
  emailMarketing: false,
  inAppEnabled: true,
} as const;

@Injectable()
export class PreferencesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<PreferenceRecord | null> {
    return this.prisma.userPreference.findUnique({ where: { userId } });
  }

  upsertDefaults(userId: string): Promise<PreferenceRecord> {
    return this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...defaultPreferenceData },
      update: {},
    });
  }

  update(
    userId: string,
    data: Partial<Pick<PreferenceRecord, 'emailOrderUpdates' | 'emailMarketing' | 'inAppEnabled'>>,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<PreferenceRecord> {
    return tx.userPreference.update({
      where: { userId },
      data,
    });
  }

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}

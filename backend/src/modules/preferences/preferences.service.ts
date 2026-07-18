import { Injectable, NotFoundException } from '@nestjs/common';
import { ConsentAction, ConsentPurpose } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { PreferencesResponseDto } from './dto/preferences-response.dto';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { PreferencesRepository, type PreferenceRecord } from './preferences.repository';

@Injectable()
export class PreferencesService {
  constructor(
    private readonly preferences: PreferencesRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getMine(userId: string): Promise<PreferencesResponseDto> {
    const row = await this.preferences.upsertDefaults(userId);
    return toResponse(row);
  }

  async updateMine(userId: string, dto: UpdatePreferencesDto): Promise<PreferencesResponseDto> {
    const current = await this.preferences.upsertDefaults(userId);

    const next = {
      emailOrderUpdates: dto.emailOrderUpdates ?? current.emailOrderUpdates,
      emailMarketing: dto.emailMarketing ?? current.emailMarketing,
      inAppEnabled: dto.inAppEnabled ?? current.inAppEnabled,
    };

    const marketingChanged =
      dto.emailMarketing !== undefined && dto.emailMarketing !== current.emailMarketing;

    const updated = await this.preferences.runTransaction(async (tx) => {
      if (marketingChanged) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });
        if (!user) throw new NotFoundException('User not found');

        await tx.consentEvent.create({
          data: {
            userId,
            email: user.email,
            purpose: ConsentPurpose.MARKETING_EMAIL,
            action: next.emailMarketing ? ConsentAction.GRANTED : ConsentAction.WITHDRAWN,
            source: 'preferences_api',
          },
        });
      }

      return this.preferences.update(userId, next, tx);
    });

    return toResponse(updated);
  }
}

function toResponse(row: PreferenceRecord): PreferencesResponseDto {
  return {
    emailOrderUpdates: row.emailOrderUpdates,
    emailMarketing: row.emailMarketing,
    inAppEnabled: row.inAppEnabled,
  };
}

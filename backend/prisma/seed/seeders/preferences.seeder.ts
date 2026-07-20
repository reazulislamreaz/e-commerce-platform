import {
  ConsentAction,
  ConsentPurpose,
} from '../../../src/generated/prisma/client';
import type { SeedContext } from '../types';
import { seedLog } from '../utils/logger';

/** User preferences (settings) + consent ledger for demo customers. */
export async function seedPreferences(ctx: SeedContext): Promise<void> {
  const { prisma, users } = ctx;
  const all = [...(users.admin ? [users.admin] : []), ...users.customers];

  for (const user of all) {
    await prisma.userPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        emailOrderUpdates: true,
        emailMarketing: user.role === 'CUSTOMER',
        inAppEnabled: true,
      },
      update: {
        emailOrderUpdates: true,
        inAppEnabled: true,
      },
    });

    const existingConsent = await prisma.consentEvent.findFirst({
      where: {
        userId: user.id,
        purpose: ConsentPurpose.ORDER_EMAIL,
        action: ConsentAction.GRANTED,
        source: 'seed:v1',
      },
      select: { id: true },
    });
    if (!existingConsent) {
      await prisma.consentEvent.create({
        data: {
          userId: user.id,
          email: user.email,
          purpose: ConsentPurpose.ORDER_EMAIL,
          action: ConsentAction.GRANTED,
          source: 'seed:v1',
        },
      });
    }

    if (user.role === 'CUSTOMER') {
      const marketing = await prisma.consentEvent.findFirst({
        where: {
          userId: user.id,
          purpose: ConsentPurpose.MARKETING_EMAIL,
          action: ConsentAction.GRANTED,
          source: 'seed:v1',
        },
        select: { id: true },
      });
      if (!marketing) {
        await prisma.consentEvent.create({
          data: {
            userId: user.id,
            email: user.email,
            purpose: ConsentPurpose.MARKETING_EMAIL,
            action: ConsentAction.GRANTED,
            source: 'seed:v1',
          },
        });
      }
    }
  }

  seedLog(`Seeded preferences and consent for ${all.length} users.`);
}

import { AddressType } from '../../../src/generated/prisma/client';
import { DEMO_ADDRESSES, addressKey } from '../data/addresses';
import { DEMO_CUSTOMERS } from '../data/users';
import { seedUuid } from '../utils/ids';
import type { SeedContext } from '../types';
import { seedLog } from '../utils/logger';

export async function seedAddresses(ctx: SeedContext): Promise<void> {
  const { prisma, users } = ctx;
  const byKey = new Map(DEMO_CUSTOMERS.map((c, i) => [c.key, users.customers[i]!]));

  for (const spec of DEMO_ADDRESSES) {
    const user = byKey.get(spec.customerKey);
    if (!user) continue;
    const id = seedUuid(addressKey(spec));
    await prisma.address.upsert({
      where: { id },
      create: {
        id,
        userId: user.id,
        label: spec.label,
        fullName: `${user.firstName} ${user.lastName}`,
        phone: user.phone,
        line1: spec.line1,
        line2: spec.line2 ?? null,
        city: spec.city,
        district: spec.district,
        postalCode: spec.postalCode,
        country: 'Bangladesh',
        type: AddressType.SHIPPING,
        isDefault: spec.isDefault,
      },
      update: {
        userId: user.id,
        label: spec.label,
        fullName: `${user.firstName} ${user.lastName}`,
        phone: user.phone,
        line1: spec.line1,
        line2: spec.line2 ?? null,
        city: spec.city,
        district: spec.district,
        postalCode: spec.postalCode,
        isDefault: spec.isDefault,
        deletedAt: null,
      },
    });
  }

  seedLog(`Seeded ${DEMO_ADDRESSES.length} customer addresses.`);
}

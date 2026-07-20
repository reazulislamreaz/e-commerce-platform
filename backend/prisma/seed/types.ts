import type { SeedConfig } from './config';
import type { SeedPrisma } from './client';
import type { Role } from '../../src/generated/prisma/client';

export interface SeedUserRef {
  id: string;
  email: string;
  phone: string;
  role: Role;
  firstName: string;
  lastName: string;
}

export interface SeedContext {
  prisma: SeedPrisma;
  config: SeedConfig;
  users: {
    superAdmin: SeedUserRef | null;
    admin: SeedUserRef | null;
    customers: SeedUserRef[];
  };
  locationId: string | null;
}

export function createSeedContext(prisma: SeedPrisma, config: SeedConfig): SeedContext {
  return {
    prisma,
    config,
    users: {
      superAdmin: null,
      admin: null,
      customers: [],
    },
    locationId: null,
  };
}

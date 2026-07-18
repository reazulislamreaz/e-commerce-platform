import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient, Role, UserStatus } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/**
 * Seeds exactly one Super Admin. Idempotent: if any SUPER_ADMIN already
 * exists, the seed is a no-op. Credentials come from the environment so no
 * secret is committed.
 */
async function main(): Promise<void> {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  const rawPhone = process.env.SEED_SUPER_ADMIN_PHONE?.trim();
  if (!email || !password || !rawPhone) {
    throw new Error(
      'SEED_SUPER_ADMIN_EMAIL, SEED_SUPER_ADMIN_PASSWORD, and SEED_SUPER_ADMIN_PHONE must be set',
    );
  }
  if (password.length < 12) {
    throw new Error('SEED_SUPER_ADMIN_PASSWORD must be at least 12 characters');
  }
  const phoneMatch = /^(?:\+?880|0)(1[3-9]\d{8})$/.exec(rawPhone.replace(/[\s-]/g, ''));
  if (!phoneMatch) {
    throw new Error('SEED_SUPER_ADMIN_PHONE must be a valid Bangladeshi mobile number');
  }
  const phone = `+880${phoneMatch[1]}`;

  const existing = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN, deletedAt: null },
    select: { email: true },
  });
  if (existing) {
    console.info(`Super Admin already exists (${existing.email}); nothing to seed.`);
    return;
  }

  const superAdmin = await prisma.user.create({
    data: {
      email,
      phone,
      passwordHash: await argon2.hash(password),
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      firstName: 'Super',
      lastName: 'Admin',
    },
    select: { email: true },
  });
  console.info(`Seeded Super Admin ${superAdmin.email}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

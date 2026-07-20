import * as argon2 from 'argon2';
import { Role, UserStatus } from '../../../src/generated/prisma/client';
import {
  DEMO_ADMIN_ID,
  DEMO_CUSTOMERS,
  demoCustomerId,
} from '../data/users';
import type { SeedContext } from '../types';
import { seedLog } from '../utils/logger';
import { normalizeBdPhone } from '../utils/phone';

async function upsertStaffUser(
  ctx: SeedContext,
  input: {
    id?: string;
    email: string;
    phone: string;
    password: string;
    role: Role;
    firstName: string;
    lastName: string;
  },
): Promise<{ id: string; email: string; phone: string; role: Role; firstName: string; lastName: string }> {
  const passwordHash = await argon2.hash(input.password);
  const existing = await ctx.prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existing) {
    const updated = await ctx.prisma.user.update({
      where: { id: existing.id },
      data: {
        phone: input.phone,
        role: input.role,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        firstName: input.firstName,
        lastName: input.lastName,
        deletedAt: null,
        // Do not rotate passwordHash on every re-run — operators may have
        // changed it. Only set hash when creating.
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });
    return {
      id: updated.id,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      firstName: updated.firstName ?? input.firstName,
      lastName: updated.lastName ?? input.lastName,
    };
  }

  const created = await ctx.prisma.user.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: input.role,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      firstName: input.firstName,
      lastName: input.lastName,
    },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      firstName: true,
      lastName: true,
    },
  });
  return {
    id: created.id,
    email: created.email,
    phone: created.phone,
    role: created.role,
    firstName: created.firstName ?? input.firstName,
    lastName: created.lastName ?? input.lastName,
  };
}

/**
 * Seeds Super Admin (env credentials), one Admin, and demo customers.
 * Idempotent on email. Super Admin: if any SUPER_ADMIN already exists with a
 * different email, that account is reused (matches prior seed behaviour).
 */
export async function seedUsers(ctx: SeedContext): Promise<void> {
  const { config, prisma } = ctx;

  const existingSuper = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN, deletedAt: null },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      firstName: true,
      lastName: true,
    },
  });

  if (existingSuper) {
    seedLog(`Super Admin already exists (${existingSuper.email}); reusing.`);
    ctx.users.superAdmin = {
      id: existingSuper.id,
      email: existingSuper.email,
      phone: existingSuper.phone,
      role: existingSuper.role,
      firstName: existingSuper.firstName ?? 'Super',
      lastName: existingSuper.lastName ?? 'Admin',
    };
  } else {
    ctx.users.superAdmin = await upsertStaffUser(ctx, {
      email: config.superAdmin.email,
      phone: config.superAdmin.phone,
      password: config.superAdmin.password,
      role: Role.SUPER_ADMIN,
      firstName: 'Super',
      lastName: 'Admin',
    });
    seedLog(`Seeded Super Admin ${ctx.users.superAdmin.email}.`);
  }

  ctx.users.admin = await upsertStaffUser(ctx, {
    id: DEMO_ADMIN_ID,
    email: config.admin.email,
    phone: config.admin.phone,
    password: config.admin.password,
    role: Role.ADMIN,
    firstName: 'Ayesha',
    lastName: 'Rahman',
  });
  seedLog(`Seeded Admin ${ctx.users.admin.email}.`);

  const passwordHash = await argon2.hash(config.demoCustomerPassword);
  const customers = [];
  for (const spec of DEMO_CUSTOMERS) {
    const id = demoCustomerId(spec.key);
    const phone = normalizeBdPhone(spec.phone);
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      create: {
        id,
        email: spec.email,
        phone,
        passwordHash,
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date('2026-01-15T00:00:00.000Z'),
        firstName: spec.firstName,
        lastName: spec.lastName,
      },
      update: {
        phone,
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date('2026-01-15T00:00:00.000Z'),
        firstName: spec.firstName,
        lastName: spec.lastName,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });
    customers.push({
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      firstName: user.firstName ?? spec.firstName,
      lastName: user.lastName ?? spec.lastName,
    });
  }
  ctx.users.customers = customers;
  seedLog(`Seeded ${customers.length} demo customers.`);
}

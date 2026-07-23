import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, Role, UserStatus } from '@/generated/prisma/client';
import { AuthService } from '@/modules/auth/auth.service';
import { AuthUserCacheService } from '@/modules/auth/auth-user-cache.service';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { AuditService } from '@/modules/platform/audit.service';
import { PrismaService } from '@/prisma/prisma.service';
import { canAssignRole, canManage } from './role-policy';
import { UserListSort } from './dto/list-users.query.dto';
import { UsersService } from './users.service';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
}));

const superAdmin: JwtPayload = {
  sub: 'super-1',
  email: 'super@example.com',
  role: Role.SUPER_ADMIN,
  sid: 's1',
  jti: 'j1',
};
const admin: JwtPayload = {
  sub: 'admin-1',
  email: 'admin@example.com',
  role: Role.ADMIN,
  sid: 's2',
  jti: 'j2',
};

function target(id: string, role: Role) {
  return { id, role, status: UserStatus.ACTIVE, deletedAt: null };
}

function listRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cust-1',
    email: 'c@example.com',
    phone: '+8801712345678',
    role: Role.CUSTOMER,
    status: UserStatus.ACTIVE,
    firstName: 'A',
    lastName: 'B',
    emailVerifiedAt: new Date('2026-01-01'),
    adminNotes: null,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    customerMetric: { orderCount: 2, lifetimeValuePoisha: 50000n },
    sessions: [{ lastSeenAt: new Date('2026-01-03'), createdAt: new Date('2026-01-02') }],
    ...overrides,
  };
}

describe('role policy', () => {
  it('SUPER_ADMIN manages admins and customers but never other super admins', () => {
    expect(canManage(Role.SUPER_ADMIN, Role.ADMIN)).toBe(true);
    expect(canManage(Role.SUPER_ADMIN, Role.CUSTOMER)).toBe(true);
    expect(canManage(Role.SUPER_ADMIN, Role.SUPER_ADMIN)).toBe(false);
  });

  it('ADMIN manages customers only', () => {
    expect(canManage(Role.ADMIN, Role.CUSTOMER)).toBe(true);
    expect(canManage(Role.ADMIN, Role.ADMIN)).toBe(false);
    expect(canManage(Role.ADMIN, Role.SUPER_ADMIN)).toBe(false);
  });

  it('only SUPER_ADMIN assigns roles, and SUPER_ADMIN is never assignable', () => {
    expect(canAssignRole(Role.SUPER_ADMIN, Role.ADMIN)).toBe(true);
    expect(canAssignRole(Role.SUPER_ADMIN, Role.CUSTOMER)).toBe(true);
    expect(canAssignRole(Role.SUPER_ADMIN, Role.SUPER_ADMIN)).toBe(false);
    expect(canAssignRole(Role.ADMIN, Role.ADMIN)).toBe(false);
    expect(canAssignRole(Role.ADMIN, Role.CUSTOMER)).toBe(false);
  });
});

describe('UsersService', () => {
  let service: UsersService;
  const prisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
    auditLog: { findMany: jest.fn() },
    product: { findMany: jest.fn() },
  };
  const auth = { revokeAllUserSessions: jest.fn(), forgotPassword: jest.fn() };
  const userCache = { invalidate: jest.fn(), get: jest.fn(), set: jest.fn() };
  const audit = { write: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (ops: unknown) => {
      if (Array.isArray(ops)) return Promise.all(ops);
      return (ops as (tx: typeof prisma) => Promise<unknown>)(prisma);
    });
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: auth },
        { provide: AuthUserCacheService, useValue: userCache },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  describe('createAdmin', () => {
    it('creates an ACTIVE admin', async () => {
      prisma.user.create.mockResolvedValue(listRow({ id: 'new-admin', role: Role.ADMIN }));
      await service.createAdmin(superAdmin, {
        email: 'New.Admin@Example.com',
        phone: '01812345678',
        password: 'StrongPassw0rd!',
        firstName: 'New',
        lastName: 'Admin',
      });
      const args = prisma.user.create.mock.calls[0][0] as {
        data: {
          email: string;
          phone: string;
          role: Role;
          status: UserStatus;
          emailVerifiedAt: Date;
        };
      };
      expect(args.data.role).toBe(Role.ADMIN);
      expect(args.data.status).toBe(UserStatus.ACTIVE);
      expect(args.data.email).toBe('new.admin@example.com');
      expect(args.data.phone).toBe('+8801812345678');
      expect(args.data.emailVerifiedAt).toBeInstanceOf(Date);
      expect(audit.write).toHaveBeenCalled();
    });

    it('maps duplicate email to 409', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      await expect(
        service.createAdmin(superAdmin, {
          email: 'dupe@example.com',
          phone: '01812345679',
          password: 'StrongPassw0rd!',
          firstName: 'A',
          lastName: 'B',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('self profile (me)', () => {
    it('returns the signed-in user profile', async () => {
      prisma.user.findUnique.mockResolvedValue(listRow({ id: 'cust-1' }));
      const result = await service.getMe('cust-1');
      expect(result.id).toBe('cust-1');
      expect(result.email).toBe('c@example.com');
      expect(result.orderCount).toBe(2);
    });

    it('normalizes the phone on self update', async () => {
      prisma.user.update.mockResolvedValue(listRow({ id: 'cust-1' }));
      await service.updateMe('cust-1', { firstName: 'Rahim', phone: '01712345678' });
      const args = prisma.user.update.mock.calls[0][0] as {
        data: { firstName: string; phone: string };
      };
      expect(args.data.firstName).toBe('Rahim');
      expect(args.data.phone).toBe('+8801712345678');
    });

    it('leaves the phone untouched when not provided', async () => {
      prisma.user.update.mockResolvedValue(listRow({ id: 'cust-1' }));
      await service.updateMe('cust-1', { lastName: 'Khan' });
      const args = prisma.user.update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect('phone' in args.data).toBe(false);
    });

    it('maps a duplicate phone to 409', async () => {
      prisma.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['phone'] },
        }),
      );
      await expect(service.updateMe('cust-1', { phone: '01712345678' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('list scoping', () => {
    it('forces the CUSTOMER role filter for admins', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([]);
      await service.list(admin, {
        page: 1,
        limit: 20,
        sort: UserListSort.CREATED_DESC,
        role: Role.ADMIN,
      });
      const args = prisma.user.findMany.mock.calls[0][0] as {
        where: { role: Role };
      };
      expect(args.where.role).toBe(Role.CUSTOMER);
    });

    it('lets SUPER_ADMIN filter by any role', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([]);
      await service.list(superAdmin, {
        page: 1,
        limit: 20,
        sort: UserListSort.CREATED_DESC,
        role: Role.ADMIN,
      });
      const args = prisma.user.findMany.mock.calls[0][0] as {
        where: { role: Role };
      };
      expect(args.where.role).toBe(Role.ADMIN);
    });

    it('returns offset pagination meta', async () => {
      prisma.user.count.mockResolvedValue(45);
      prisma.user.findMany.mockResolvedValue([listRow()]);
      const result = await service.list(admin, {
        page: 2,
        limit: 20,
        sort: UserListSort.CREATED_DESC,
      });
      expect(result.meta).toEqual({
        page: 2,
        pageSize: 20,
        limit: 20,
        total: 45,
        totalPages: 3,
        nextCursor: null,
      });
      expect(result.data[0]?.totalSpending).toBe(500);
    });
  });

  describe('hierarchy enforcement', () => {
    it('ADMIN cannot suspend another admin', async () => {
      prisma.user.findUnique.mockResolvedValue(target('admin-2', Role.ADMIN));
      await expect(
        service.updateStatus(admin, 'admin-2', UserStatus.SUSPENDED),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('ADMIN cannot delete a super admin', async () => {
      prisma.user.findUnique.mockResolvedValue(target('super-1', Role.SUPER_ADMIN));
      await expect(service.softDelete(admin, 'super-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('nobody can manage a SUPER_ADMIN account', async () => {
      prisma.user.findUnique.mockResolvedValue(target('super-2', Role.SUPER_ADMIN));
      await expect(
        service.updateStatus(superAdmin, 'super-2', UserStatus.SUSPENDED),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('no self-management through admin endpoints', async () => {
      prisma.user.findUnique.mockResolvedValue(target(superAdmin.sub, Role.ADMIN));
      await expect(
        service.updateStatus(superAdmin, superAdmin.sub, UserStatus.SUSPENDED),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deleted users read as not found', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...target('gone', Role.CUSTOMER),
        deletedAt: new Date(),
      });
      await expect(
        service.updateStatus(superAdmin, 'gone', UserStatus.ACTIVE),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('ADMIN cannot read an admin account by id', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin-2', role: Role.ADMIN });
      await expect(service.getById(admin, 'admin-2')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('mutations with side effects', () => {
    it('suspension revokes all sessions of the target', async () => {
      prisma.user.findUnique.mockResolvedValue(target('cust-1', Role.CUSTOMER));
      prisma.user.update.mockResolvedValue(listRow({ id: 'cust-1', status: UserStatus.SUSPENDED }));
      await service.updateStatus(admin, 'cust-1', UserStatus.SUSPENDED);
      expect(auth.revokeAllUserSessions).toHaveBeenCalledWith('cust-1');
    });

    it('activation does not revoke sessions', async () => {
      prisma.user.findUnique.mockResolvedValue(target('cust-1', Role.CUSTOMER));
      prisma.user.update.mockResolvedValue(listRow({ id: 'cust-1', status: UserStatus.ACTIVE }));
      await service.updateStatus(admin, 'cust-1', UserStatus.ACTIVE);
      expect(auth.revokeAllUserSessions).not.toHaveBeenCalled();
    });

    it('role promotion revokes sessions and is SUPER_ADMIN gated', async () => {
      prisma.user.findUnique.mockResolvedValue(target('cust-1', Role.CUSTOMER));
      prisma.user.update.mockResolvedValue(listRow({ id: 'cust-1', role: Role.ADMIN }));
      await service.updateRole(superAdmin, 'cust-1', Role.ADMIN);
      expect(auth.revokeAllUserSessions).toHaveBeenCalledWith('cust-1');

      await expect(service.updateRole(admin, 'cust-1', Role.ADMIN)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('soft delete anonymizes email and phone and revokes sessions', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(target('cust-1', Role.CUSTOMER))
        .mockResolvedValueOnce({ email: 'c@example.com', phone: '+8801712345678' });
      prisma.user.update.mockResolvedValue({});
      await service.softDelete(admin, 'cust-1');
      const args = prisma.user.update.mock.calls[0][0] as {
        data: {
          email: string;
          phone: string;
          deletedAt: Date;
          deletedEmail: string;
          deletedPhone: string;
        };
      };
      expect(args.data.email).toBe('deleted+cust-1@deleted.invalid');
      expect(args.data.phone).toBe('deleted+cust-1');
      expect(args.data.deletedEmail).toBe('c@example.com');
      expect(args.data.deletedPhone).toBe('+8801712345678');
      expect(args.data.deletedAt).toBeInstanceOf(Date);
      expect(auth.revokeAllUserSessions).toHaveBeenCalledWith('cust-1');
    });
  });
});

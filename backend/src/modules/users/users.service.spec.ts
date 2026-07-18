import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, Role, UserStatus } from '@/generated/prisma/client';
import { AuthService } from '@/modules/auth/auth.service';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { PrismaService } from '@/prisma/prisma.service';
import { canAssignRole, canManage } from './role-policy';
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
      update: jest.fn(),
    },
  };
  const auth = { revokeAllUserSessions: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: auth },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  describe('createAdmin', () => {
    it('creates an ACTIVE admin', async () => {
      prisma.user.create.mockResolvedValue({ id: 'new-admin', role: Role.ADMIN });
      await service.createAdmin({
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
    });

    it('maps duplicate email to 409', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      await expect(
        service.createAdmin({
          email: 'dupe@example.com',
          phone: '01812345679',
          password: 'StrongPassw0rd!',
          firstName: 'A',
          lastName: 'B',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('list scoping', () => {
    it('forces the CUSTOMER role filter for admins', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await service.list(admin, { limit: 20, role: Role.ADMIN });
      const args = prisma.user.findMany.mock.calls[0][0] as {
        where: { role: Role };
      };
      expect(args.where.role).toBe(Role.CUSTOMER);
    });

    it('lets SUPER_ADMIN filter by any role', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await service.list(superAdmin, { limit: 20, role: Role.ADMIN });
      const args = prisma.user.findMany.mock.calls[0][0] as {
        where: { role: Role };
      };
      expect(args.where.role).toBe(Role.ADMIN);
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
      await expect(service.softDelete(admin, 'super-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
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
      prisma.user.update.mockResolvedValue({ id: 'cust-1', status: UserStatus.SUSPENDED });
      await service.updateStatus(admin, 'cust-1', UserStatus.SUSPENDED);
      expect(auth.revokeAllUserSessions).toHaveBeenCalledWith('cust-1');
    });

    it('activation does not revoke sessions', async () => {
      prisma.user.findUnique.mockResolvedValue(target('cust-1', Role.CUSTOMER));
      prisma.user.update.mockResolvedValue({ id: 'cust-1', status: UserStatus.ACTIVE });
      await service.updateStatus(admin, 'cust-1', UserStatus.ACTIVE);
      expect(auth.revokeAllUserSessions).not.toHaveBeenCalled();
    });

    it('role promotion revokes sessions and is SUPER_ADMIN gated', async () => {
      prisma.user.findUnique.mockResolvedValue(target('cust-1', Role.CUSTOMER));
      prisma.user.update.mockResolvedValue({ id: 'cust-1', role: Role.ADMIN });
      await service.updateRole(superAdmin, 'cust-1', Role.ADMIN);
      expect(auth.revokeAllUserSessions).toHaveBeenCalledWith('cust-1');

      await expect(service.updateRole(admin, 'cust-1', Role.ADMIN)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('soft delete anonymizes the email and revokes sessions', async () => {
      prisma.user.findUnique.mockResolvedValue(target('cust-1', Role.CUSTOMER));
      prisma.user.update.mockResolvedValue({});
      await service.softDelete(admin, 'cust-1');
      const args = prisma.user.update.mock.calls[0][0] as {
        data: { email: string; deletedAt: Date };
      };
      expect(args.data.email).toBe('deleted+cust-1@deleted.invalid');
      expect(args.data.deletedAt).toBeInstanceOf(Date);
      expect(auth.revokeAllUserSessions).toHaveBeenCalledWith('cust-1');
    });
  });
});

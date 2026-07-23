import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Prisma, Role, UserStatus, VerificationTokenType } from '@/generated/prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '@/prisma/prisma.service';
import { CustomerMetricsService } from '@/modules/crm/customer-metrics.service';
import { MailService } from '@/modules/mail/mail.service';
import { AuthSessionCacheService } from './auth-session-cache.service';
import { AuthService } from './auth.service';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  verify: jest.fn(),
}));

const argonVerify = argon2.verify as jest.MockedFunction<typeof argon2.verify>;

type MockedModel = Record<string, jest.Mock>;

function createPrismaMock() {
  const prisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    } satisfies MockedModel,
    authSession: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    } satisfies MockedModel,
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    } satisfies MockedModel,
    verificationToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    } satisfies MockedModel,
    $transaction: jest.fn(),
  };
  // Interactive transactions receive the mock itself as the transaction client.
  prisma.$transaction.mockImplementation((arg: unknown) => {
    if (typeof arg === 'function') return (arg as (tx: typeof prisma) => unknown)(prisma);
    return Promise.all(arg as Promise<unknown>[]);
  });
  return prisma;
}

const baseUser = {
  id: 'user-1',
  email: 'user@example.com',
  phone: '+8801712345678',
  passwordHash: 'hash',
  role: Role.CUSTOMER,
  status: UserStatus.ACTIVE,
  firstName: 'Test',
  lastName: 'User',
  emailVerifiedAt: new Date(),
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const registerInput = {
  email: 'new@example.com',
  phone: '01712345679',
  password: '123456',
  fullName: 'A B',
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createPrismaMock>;
  const mail = {
    sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    sendWelcome: jest.fn().mockResolvedValue(undefined),
  };
  const customerMetrics = {
    recordActivity: jest.fn().mockResolvedValue(undefined),
    recomputeForUser: jest.fn().mockResolvedValue(undefined),
  };
  const sessionCache = {
    markRevoked: jest.fn().mockResolvedValue(undefined),
    isRevoked: jest.fn().mockResolvedValue(false),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('jwt') } },
        { provide: MailService, useValue: mail },
        { provide: CustomerMetricsService, useValue: customerMetrics },
        { provide: AuthSessionCacheService, useValue: sessionCache },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret-refresh-secret-1234';
              if (key === 'FRONTEND_ORIGIN') return 'http://localhost:3000';
              return 'access';
            }),
          },
        },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('creates an ACTIVE user with a normalized E.164 phone and sends welcome email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...baseUser,
        id: 'new-user',
        email: registerInput.email,
        firstName: 'A',
        lastName: 'B',
      });

      await service.register(registerInput);

      const createArgs = prisma.user.create.mock.calls[0][0] as {
        data: {
          phone: string;
          status: UserStatus;
          firstName: string;
          lastName: string;
          emailVerifiedAt: Date;
        };
      };
      expect(createArgs.data.phone).toBe('+8801712345679');
      expect(createArgs.data.status).toBe(UserStatus.ACTIVE);
      expect(createArgs.data.firstName).toBe('A');
      expect(createArgs.data.lastName).toBe('B');
      expect(createArgs.data.emailVerifiedAt).toBeInstanceOf(Date);
      expect(prisma.verificationToken.create).not.toHaveBeenCalled();
      expect(mail.sendEmailVerification).not.toHaveBeenCalled();
      expect(mail.sendWelcome).toHaveBeenCalledWith(
        expect.objectContaining({
          to: registerInput.email,
          firstName: 'A',
        }),
      );
    });

    it('activates a legacy pending account and does not require email verification', async () => {
      prisma.user.findUnique.mockImplementation(
        ({ where }: { where: { email?: string; phone?: string } }) => {
          if (where.email) {
            return Promise.resolve({
              id: 'pending-1',
              status: UserStatus.PENDING_VERIFICATION,
              deletedAt: null,
            });
          }
          return Promise.resolve(null);
        },
      );
      prisma.user.update.mockResolvedValue({
        ...baseUser,
        id: 'pending-1',
        email: registerInput.email,
        status: UserStatus.ACTIVE,
        firstName: 'A',
        lastName: 'B',
      });

      const result = await service.register(registerInput);

      expect(result.id).toBe('pending-1');
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(argon2.hash).toHaveBeenCalledWith(registerInput.password);
      expect(mail.sendEmailVerification).not.toHaveBeenCalled();
      expect(mail.sendWelcome).toHaveBeenCalled();
    });

    it('maps a duplicate active email to a clear 409', async () => {
      prisma.user.findUnique.mockImplementation(
        ({ where }: { where: { email?: string; phone?: string } }) => {
          if (where.email) {
            return Promise.resolve({
              id: 'existing',
              status: UserStatus.ACTIVE,
              deletedAt: null,
            });
          }
          return Promise.resolve(null);
        },
      );
      await expect(service.register(registerInput)).rejects.toThrow(
        'An account with this email already exists. Try logging in or use a different email address.',
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('maps a duplicate phone to a clear 409', async () => {
      prisma.user.findUnique.mockImplementation(
        ({ where }: { where: { email?: string; phone?: string } }) => {
          if (where.phone) {
            return Promise.resolve({
              id: 'existing',
              email: 'other@example.com',
              deletedAt: null,
            });
          }
          return Promise.resolve(null);
        },
      );
      await expect(service.register(registerInput)).rejects.toBeInstanceOf(ConflictException);
      await expect(service.register(registerInput)).rejects.toThrow(
        'An account with this mobile number already exists. Try logging in or use a different number.',
      );
    });

    it('maps a raced P2002 phone conflict using adapter meta shapes', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
          meta: {
            driverAdapterError: {
              cause: {
                originalMessage: 'duplicate key value violates unique constraint "User_phone_key"',
                constraint: { index: 'User_phone_key' },
              },
            },
          },
        }),
      );
      await expect(service.register(registerInput)).rejects.toThrow(
        'An account with this mobile number already exists. Try logging in or use a different number.',
      );
    });
  });

  describe('verifyEmail', () => {
    const pendingToken = {
      id: 'vt-1',
      userId: 'user-1',
      tokenHash: 'hash',
      type: VerificationTokenType.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      user: {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'Test',
        status: UserStatus.PENDING_VERIFICATION,
        deletedAt: null,
      },
    };

    it('activates the account and stamps emailVerifiedAt', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(pendingToken);
      prisma.verificationToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.update.mockResolvedValue({});

      await service.verifyEmail('raw-token');

      const updateArgs = prisma.user.update.mock.calls[0][0] as {
        data: { status: UserStatus; emailVerifiedAt: Date };
      };
      expect(updateArgs.data.status).toBe(UserStatus.ACTIVE);
      expect(updateArgs.data.emailVerifiedAt).toBeInstanceOf(Date);
    });

    it('rejects unknown tokens', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(null);
      await expect(service.verifyEmail('bogus')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects expired tokens', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        ...pendingToken,
        expiresAt: new Date(Date.now() - 1),
      });
      await expect(service.verifyEmail('expired')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects already-used tokens without touching the user', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        ...pendingToken,
        usedAt: new Date(),
      });
      await expect(service.verifyEmail('used')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('resendVerification', () => {
    it('is silent for unknown or already-verified emails', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await service.resendVerification('ghost@example.com');
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, status: UserStatus.ACTIVE });
      await service.resendVerification(baseUser.email);
      expect(mail.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('invalidates older tokens and sends a fresh link for pending accounts', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        status: UserStatus.PENDING_VERIFICATION,
      });
      prisma.verificationToken.create.mockResolvedValue({ id: 'vt-2' });
      await service.resendVerification(baseUser.email);
      expect(prisma.verificationToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: baseUser.id, usedAt: null }) as unknown,
        }),
      );
      expect(mail.sendEmailVerification).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('rejects unverified accounts even with a valid password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerifiedAt: null,
      });
      argonVerify.mockResolvedValue(true);
      await expect(service.login({ email: baseUser.email, password: 'x' }, {})).rejects.toThrow(
        'Please verify your email address before signing in',
      );
    });

    it('creates a session with an initial refresh token', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);
      argonVerify.mockResolvedValue(true);
      prisma.authSession.create.mockResolvedValue({ id: 'session-1' });

      const result = await service.login(
        { email: baseUser.email, password: 'x' },
        { ip: '127.0.0.1', userAgent: 'jest' },
      );

      expect(result.accessToken).toBe('jwt');
      expect(result.refreshToken).toHaveLength(64);
      expect(result.rememberMe).toBe(false);
      const createArgs = prisma.authSession.create.mock.calls[0][0] as {
        data: { rememberMe: boolean; refreshTokens: { create: { tokenHash: string } } };
      };
      expect(createArgs.data.rememberMe).toBe(false);
      expect(createArgs.data.refreshTokens.create.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(createArgs.data.refreshTokens.create.tokenHash).not.toContain(result.refreshToken);
    });

    it('extends the session lifetime when rememberMe is set', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);
      argonVerify.mockResolvedValue(true);
      prisma.authSession.create.mockResolvedValue({ id: 'session-1' });

      const before = Date.now();
      const result = await service.login(
        { email: baseUser.email, password: 'x', rememberMe: true },
        {},
      );

      expect(result.rememberMe).toBe(true);
      const createArgs = prisma.authSession.create.mock.calls[0][0] as {
        data: { rememberMe: boolean; expiresAt: Date };
      };
      expect(createArgs.data.rememberMe).toBe(true);
      const ttl = createArgs.data.expiresAt.getTime() - before;
      expect(ttl).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
      expect(ttl).toBeLessThanOrEqual(30 * 24 * 60 * 60 * 1000 + 5_000);
    });
  });

  describe('forgotPassword', () => {
    it('is silent for unknown, deleted, or non-active accounts', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await service.forgotPassword('ghost@example.com');
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        status: UserStatus.PENDING_VERIFICATION,
      });
      await service.forgotPassword(baseUser.email);
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, status: UserStatus.SUSPENDED });
      await service.forgotPassword(baseUser.email);
      expect(mail.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('invalidates older reset tokens and emails a fresh link for active accounts', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);
      prisma.verificationToken.create.mockResolvedValue({ id: 'vt-r1' });

      await service.forgotPassword(baseUser.email);

      expect(prisma.verificationToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: baseUser.id,
            type: VerificationTokenType.PASSWORD_RESET,
            usedAt: null,
          }) as unknown,
        }),
      );
      const tokenArgs = prisma.verificationToken.create.mock.calls[0][0] as {
        data: { tokenHash: string; type: VerificationTokenType; expiresAt: Date };
      };
      expect(tokenArgs.data.type).toBe(VerificationTokenType.PASSWORD_RESET);
      expect(tokenArgs.data.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(30 * 60 * 1000);
      const email = mail.sendPasswordReset.mock.calls[0][0] as { resetUrl: string };
      expect(email.resetUrl).toMatch(/^http:\/\/localhost:3000\/reset-password\?token=/);
      expect(email.resetUrl).not.toContain(tokenArgs.data.tokenHash);
    });
  });

  describe('resetPassword', () => {
    const resetToken = {
      id: 'vt-r1',
      userId: baseUser.id,
      tokenHash: 'hash',
      type: VerificationTokenType.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      user: { id: baseUser.id, status: UserStatus.ACTIVE, deletedAt: null },
    };

    it('sets the new password and revokes every session', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(resetToken);
      prisma.verificationToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.update.mockResolvedValue({});
      prisma.authSession.updateMany.mockResolvedValue({ count: 1 });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.resetPassword('raw-token', 'NewStrongPassw0rd!');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: baseUser.id },
          data: { passwordHash: 'hashed' },
        }),
      );
      expect(prisma.authSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: baseUser.id }) as unknown,
        }),
      );
    });

    it('rejects expired tokens', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        ...resetToken,
        expiresAt: new Date(Date.now() - 1),
      });
      await expect(service.resetPassword('expired', 'NewStrongPassw0rd!')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects already-used tokens', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        ...resetToken,
        usedAt: new Date(),
      });
      await expect(service.resetPassword('used', 'NewStrongPassw0rd!')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects email-verification tokens presented as reset tokens', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        ...resetToken,
        type: VerificationTokenType.EMAIL_VERIFICATION,
      });
      await expect(
        service.resetPassword('wrong-type', 'NewStrongPassw0rd!'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects tokens of suspended users', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        ...resetToken,
        user: { ...resetToken.user, status: UserStatus.SUSPENDED },
      });
      await expect(service.resetPassword('suspended', 'NewStrongPassw0rd!')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('changePassword', () => {
    it('rejects a wrong current password', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: baseUser.id, passwordHash: 'hash' });
      argonVerify.mockResolvedValue(false);
      await expect(
        service.changePassword(baseUser.id, 'session-1', 'wrong', 'NewStrongPassw0rd!'),
      ).rejects.toThrow('The current password you entered is incorrect. Please try again.');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects reusing the current password', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: baseUser.id, passwordHash: 'hash' });
      argonVerify.mockResolvedValue(true);
      await expect(
        service.changePassword(baseUser.id, 'session-1', 'SamePassw0rd!!', 'SamePassw0rd!!'),
      ).rejects.toThrow('Your new password must be different from your current password.');
    });

    it('updates the hash and revokes every other session', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: baseUser.id, passwordHash: 'hash' });
      argonVerify.mockResolvedValue(true);
      prisma.user.update.mockResolvedValue({});
      prisma.authSession.updateMany.mockResolvedValue({ count: 1 });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.changePassword(
        baseUser.id,
        'session-1',
        'CurrentPassw0rd!',
        'NewStrongPassw0rd!',
      );

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { passwordHash: 'hashed' } }),
      );
      expect(prisma.authSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: baseUser.id,
            id: { not: 'session-1' },
          }) as unknown,
        }),
      );
    });
  });

  describe('refresh', () => {
    const activeToken = {
      id: 'token-1',
      sessionId: 'session-1',
      tokenHash: 'hash',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      revokedAt: null,
      replacedById: null,
      createdAt: new Date(),
      session: {
        id: 'session-1',
        userId: baseUser.id,
        rememberMe: false,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        user: baseUser,
      },
    };

    it('rejects unknown tokens', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('unknown')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('revokes the whole family when a consumed token is replayed', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({ ...activeToken, usedAt: new Date() });
      await expect(service.refresh('replayed')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ familyId: 'family-1' }) as unknown,
        }),
      );
      expect(prisma.authSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'session-1' }) as unknown,
        }),
      );
    });

    it('fails when a concurrent request already claimed the token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(activeToken);
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.refresh('raced')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rotates the token and links the replacement', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(activeToken);
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.refreshToken.create.mockResolvedValue({ id: 'token-2' });

      const result = await service.refresh('valid');

      expect(result.accessToken).toBe('jwt');
      expect(result.refreshToken).toHaveLength(64);
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { replacedById: 'token-2' },
      });
    });

    it('rejects tokens whose user is suspended', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...activeToken,
        session: {
          ...activeToken.session,
          user: { ...baseUser, status: UserStatus.SUSPENDED },
        },
      });
      await expect(service.refresh('suspended')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes the session and its refresh tokens', async () => {
      prisma.authSession.updateMany.mockResolvedValue({ count: 1 });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      await service.logout('session-1');
      expect(prisma.authSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'session-1' }) as unknown,
        }),
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ sessionId: 'session-1' }) as unknown,
        }),
      );
    });
  });
});

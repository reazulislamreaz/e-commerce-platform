import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, type User, UserStatus, VerificationTokenType } from '@/generated/prisma/client';
import * as argon2 from 'argon2';
import { normalizeBdPhone } from '@/common/utils/bd-phone';
import { uniqueConflictIncludes } from '@/common/utils/prisma-unique-conflict';
import { splitFullName } from '@/common/utils/split-full-name';
import { MailService } from '@/modules/mail/mail.service';
import { CustomerMetricsService } from '@/modules/crm/customer-metrics.service';
import { PrismaService } from '@/prisma/prisma.service';
import { USER_FACING } from '@/common/messages/user-facing-errors';
import { AuthSessionCacheService } from './auth-session-cache.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './jwt.strategy';

const EMAIL_ALREADY_REGISTERED = USER_FACING.EMAIL_ALREADY_REGISTERED;
const PHONE_ALREADY_REGISTERED = USER_FACING.PHONE_ALREADY_REGISTERED;
const SESSION_EXPIRED = USER_FACING.SESSION_ENDED;

const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const REMEMBER_ME_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export interface SessionMeta {
  ip?: string;
  userAgent?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Echoes the session's remember-me choice so the cookie max-age can match. */
  rememberMe: boolean;
}

function refreshTtlMs(rememberMe: boolean): number {
  return rememberMe ? REMEMBER_ME_REFRESH_TOKEN_TTL_MS : REFRESH_TOKEN_TTL_MS;
}

const userSelect = {
  id: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  firstName: true,
  lastName: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly customerMetrics: CustomerMetricsService,
    private readonly sessionCache: AuthSessionCacheService,
  ) {}

  /**
   * Creates an ACTIVE customer account immediately and sends the welcome email.
   * Email verification is no longer part of signup; legacy PENDING accounts that
   * re-register with the same email are activated with the new credentials.
   */
  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    // DTO validation guarantees the format; normalization cannot fail here.
    const phone = normalizeBdPhone(dto.phone) as string;
    const { firstName, lastName } = splitFullName(dto.fullName);
    const passwordHash = await argon2.hash(dto.password);
    const now = new Date();

    // Clear, field-accurate conflicts before create. Soft-deleted rows still
    // hold unique phones until anonymized — free those so re-registration works.
    const [byEmail, byPhone] = await Promise.all([
      this.prisma.user.findUnique({
        where: { email },
        select: { id: true, status: true, deletedAt: true },
      }),
      this.prisma.user.findUnique({
        where: { phone },
        select: { id: true, email: true, deletedAt: true },
      }),
    ]);

    if (byEmail && !byEmail.deletedAt) {
      if (byEmail.status === UserStatus.PENDING_VERIFICATION) {
        // Legacy pending signup: activate with the new password/name/phone.
        if (byPhone && !byPhone.deletedAt && byPhone.email !== email) {
          throw new ConflictException(PHONE_ALREADY_REGISTERED);
        }
        if (byPhone?.deletedAt) {
          await this.prisma.user.update({
            where: { id: byPhone.id },
            data: { phone: `deleted+${byPhone.id}` },
          });
        }
        const activated = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            phone,
            passwordHash,
            firstName,
            lastName,
            status: UserStatus.ACTIVE,
            emailVerifiedAt: now,
          },
          select: userSelect,
        });
        await this.mail.sendWelcome({
          to: activated.email,
          firstName: activated.firstName ?? '',
          shopUrl: `${this.config.getOrThrow<string>('FRONTEND_ORIGIN')}/shop`,
        });
        return activated;
      }
      throw new ConflictException(EMAIL_ALREADY_REGISTERED);
    }

    if (byPhone && !byPhone.deletedAt) {
      throw new ConflictException(PHONE_ALREADY_REGISTERED);
    }

    if (byPhone?.deletedAt) {
      await this.prisma.user.update({
        where: { id: byPhone.id },
        data: { phone: `deleted+${byPhone.id}` },
      });
    }

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          phone,
          passwordHash,
          firstName,
          lastName,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: now,
        },
        select: userSelect,
      });
    } catch (error) {
      // Unique indexes arbitrate concurrent registrations; a pre-check alone is race-prone.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          uniqueConflictIncludes(error, 'phone')
            ? PHONE_ALREADY_REGISTERED
            : EMAIL_ALREADY_REGISTERED,
        );
      }
      throw error;
    }

    await this.mail.sendWelcome({
      to: user.email,
      firstName: user.firstName ?? '',
      shopUrl: `${this.config.getOrThrow<string>('FRONTEND_ORIGIN')}/shop`,
    });
    await this.customerMetrics.recordActivity(
      user.id,
      'ACCOUNT_REGISTERED',
      'Account created',
      '/account/settings',
    );
    await this.customerMetrics.recomputeForUser(user.id);
    return user;
  }

  /** Consumes a verification token and activates the account. */
  async verifyEmail(rawToken: string): Promise<void> {
    const now = new Date();
    const token = await this.prisma.verificationToken.findUnique({
      where: { tokenHash: this.hashVerificationToken(rawToken) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });
    if (
      !token ||
      token.type !== VerificationTokenType.EMAIL_VERIFICATION ||
      token.expiresAt <= now ||
      token.user.deletedAt
    )
      throw new BadRequestException(USER_FACING.VERIFICATION_LINK);
    if (token.usedAt || token.user.status !== UserStatus.PENDING_VERIFICATION)
      throw new BadRequestException(USER_FACING.ALREADY_VERIFIED);

    await this.prisma.$transaction(async (tx) => {
      // Atomic claim: a token can activate an account exactly once.
      const claimed = await tx.verificationToken.updateMany({
        where: { id: token.id, usedAt: null },
        data: { usedAt: now },
      });
      if (claimed.count === 0) throw new BadRequestException(USER_FACING.ALREADY_VERIFIED);
      await tx.user.update({
        where: { id: token.userId },
        data: { status: UserStatus.ACTIVE, emailVerifiedAt: now },
      });
    });
    await this.mail.sendWelcome({
      to: token.user.email,
      firstName: token.user.firstName ?? '',
      shopUrl: `${this.config.getOrThrow<string>('FRONTEND_ORIGIN')}/shop`,
    });
  }

  /**
   * Re-sends the verification email. Responds identically whether or not the
   * email exists, so account presence is never leaked.
   */
  async resendVerification(rawEmail: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: rawEmail.trim().toLowerCase() },
      select: { id: true, email: true, firstName: true, status: true, deletedAt: true },
    });
    if (!user || user.deletedAt || user.status !== UserStatus.PENDING_VERIFICATION) return;
    await this.issueEmailVerification(user.id, user.email, user.firstName);
  }

  private async issueEmailVerification(
    userId: string,
    email: string,
    firstName: string | null,
  ): Promise<void> {
    const rawToken = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      // A fresh link supersedes older ones: only the newest token stays valid.
      this.prisma.verificationToken.updateMany({
        where: { userId, type: VerificationTokenType.EMAIL_VERIFICATION, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.verificationToken.create({
        data: {
          userId,
          tokenHash: this.hashVerificationToken(rawToken),
          type: VerificationTokenType.EMAIL_VERIFICATION,
          expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
        },
      }),
    ]);

    const verifyUrl = `${this.config.getOrThrow<string>('FRONTEND_ORIGIN')}/verify-email?token=${rawToken}`;
    await this.mail.sendEmailVerification({ to: email, firstName: firstName ?? '', verifyUrl });
  }

  /** Unkeyed hash is fine here: tokens are 256-bit random, not guessable. */
  private hashVerificationToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Sends a password reset link. Responds identically whether or not the
   * email belongs to an account, so account presence is never leaked.
   * Only ACTIVE accounts receive a link; suspended (and any legacy pending)
   * accounts must not regain access via reset.
   */
  async forgotPassword(rawEmail: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: rawEmail.trim().toLowerCase() },
      select: { id: true, email: true, firstName: true, status: true, deletedAt: true },
    });
    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) return;

    const rawToken = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      // A fresh link supersedes older ones: only the newest token stays valid.
      this.prisma.verificationToken.updateMany({
        where: { userId: user.id, type: VerificationTokenType.PASSWORD_RESET, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.verificationToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashVerificationToken(rawToken),
          type: VerificationTokenType.PASSWORD_RESET,
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        },
      }),
    ]);

    const resetUrl = `${this.config.getOrThrow<string>('FRONTEND_ORIGIN')}/reset-password?token=${rawToken}`;
    await this.mail.sendPasswordReset({
      to: user.email,
      firstName: user.firstName ?? '',
      resetUrl,
    });
  }

  /**
   * Consumes a reset token and sets the new password. Every session of the
   * user is revoked: a reset usually means the old credentials are suspect.
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const now = new Date();
    const token = await this.prisma.verificationToken.findUnique({
      where: { tokenHash: this.hashVerificationToken(rawToken) },
      include: { user: { select: { id: true, status: true, deletedAt: true } } },
    });
    if (
      !token ||
      token.type !== VerificationTokenType.PASSWORD_RESET ||
      token.usedAt ||
      token.expiresAt <= now ||
      token.user.deletedAt ||
      token.user.status !== UserStatus.ACTIVE
    )
      throw new BadRequestException(USER_FACING.RESET_LINK);

    const passwordHash = await argon2.hash(newPassword);
    const revokedSessionIds = await this.prisma.$transaction(async (tx) => {
      // Atomic claim: a token can reset the password exactly once.
      const claimed = await tx.verificationToken.updateMany({
        where: { id: token.id, usedAt: null },
        data: { usedAt: now },
      });
      if (claimed.count === 0) throw new BadRequestException(USER_FACING.RESET_LINK);
      await tx.user.update({ where: { id: token.userId }, data: { passwordHash } });
      const sessions = await tx.authSession.findMany({
        where: { userId: token.userId, revokedAt: null },
        select: { id: true },
      });
      await tx.authSession.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.refreshToken.updateMany({
        where: { session: { userId: token.userId }, revokedAt: null },
        data: { revokedAt: now },
      });
      return sessions.map((session) => session.id);
    });
    await this.sessionCache.markRevoked(revokedSessionIds);
  }

  /**
   * Authenticated password change. Other sessions are revoked; the current
   * session stays alive so the user is not logged out of the device they
   * changed the password from.
   */
  async changePassword(
    userId: string,
    currentSessionId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user || !(await argon2.verify(user.passwordHash, currentPassword)))
      throw new BadRequestException(USER_FACING.CURRENT_PASSWORD_INCORRECT);
    if (currentPassword === newPassword)
      throw new BadRequestException(USER_FACING.PASSWORD_MUST_DIFFER);

    const now = new Date();
    const passwordHash = await argon2.hash(newPassword);
    const revokedSessionIds = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      const sessions = await tx.authSession.findMany({
        where: { userId, id: { not: currentSessionId }, revokedAt: null },
        select: { id: true },
      });
      await tx.authSession.updateMany({
        where: { userId, id: { not: currentSessionId }, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.refreshToken.updateMany({
        where: { session: { userId, id: { not: currentSessionId } }, revokedAt: null },
        data: { revokedAt: now },
      });
      return sessions.map((session) => session.id);
    });
    await this.sessionCache.markRevoked(revokedSessionIds);
  }

  async login(dto: LoginDto, meta: SessionMeta) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!user || user.deletedAt || !(await argon2.verify(user.passwordHash, dto.password)))
      throw new UnauthorizedException(USER_FACING.INVALID_CREDENTIALS);
    if (user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException(
        user.status === UserStatus.SUSPENDED
          ? USER_FACING.ACCOUNT_SUSPENDED
          : USER_FACING.EMAIL_NOT_VERIFIED,
      );

    const rememberMe = dto.rememberMe ?? false;
    const now = Date.now();
    const ttlMs = refreshTtlMs(rememberMe);
    const rawRefreshToken = this.generateRefreshToken();
    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        ip: meta.ip,
        userAgent: meta.userAgent?.slice(0, 512),
        rememberMe,
        expiresAt: new Date(now + ttlMs),
        refreshTokens: {
          create: {
            tokenHash: this.hashRefreshToken(rawRefreshToken),
            familyId: randomUUID(),
            expiresAt: new Date(now + ttlMs),
          },
        },
      },
      select: { id: true },
    });

    return {
      user: this.toSafeUser(user),
      accessToken: await this.signAccessToken(user, session.id),
      refreshToken: rawRefreshToken,
      rememberMe,
    };
  }

  /**
   * Rotate a refresh token. The consume step is an atomic conditional update,
   * so two concurrent refreshes with the same token cannot both succeed.
   * Reuse of an already-consumed token revokes the entire token family; that
   * revocation commits in its own transaction before the request is rejected,
   * so the rejection cannot roll it back.
   */
  async refresh(rawToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashRefreshToken(rawToken);
    const now = new Date();

    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { session: { include: { user: true } } },
    });
    if (!token) throw new UnauthorizedException(SESSION_EXPIRED);

    if (token.usedAt || token.revokedAt) {
      await this.revokeTokenFamily(token.familyId, token.sessionId, now);
      throw new UnauthorizedException(SESSION_EXPIRED);
    }

    const { session } = token;
    if (
      token.expiresAt <= now ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.deletedAt ||
      session.user.status !== UserStatus.ACTIVE
    )
      throw new UnauthorizedException(SESSION_EXPIRED);

    const ttlMs = refreshTtlMs(session.rememberMe);
    const nextRefreshToken = await this.prisma.$transaction(async (tx) => {
      // Atomic claim: only one concurrent request can consume this token.
      const claimed = await tx.refreshToken.updateMany({
        where: { id: token.id, usedAt: null, revokedAt: null },
        data: { usedAt: now },
      });
      if (claimed.count === 0) throw new UnauthorizedException(SESSION_EXPIRED);

      const raw = this.generateRefreshToken();
      const replacement = await tx.refreshToken.create({
        data: {
          sessionId: session.id,
          tokenHash: this.hashRefreshToken(raw),
          familyId: token.familyId,
          expiresAt: new Date(now.getTime() + ttlMs),
        },
        select: { id: true },
      });
      await tx.refreshToken.update({
        where: { id: token.id },
        data: { replacedById: replacement.id },
      });
      await tx.authSession.update({
        where: { id: session.id },
        data: { lastSeenAt: now, expiresAt: new Date(now.getTime() + ttlMs) },
      });
      return raw;
    });

    return {
      accessToken: await this.signAccessToken(session.user, session.id),
      refreshToken: nextRefreshToken,
      rememberMe: session.rememberMe,
    };
  }

  /** Replay response: kill every token in the family and the owning session. */
  private async revokeTokenFamily(familyId: string, sessionId: string, now: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.authSession.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    await this.sessionCache.markRevoked([sessionId]);
  }

  async logout(sessionId: string): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.authSession.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    await this.sessionCache.markRevoked([sessionId]);
  }

  /** Force-logout everywhere: used when an account is suspended or deleted. */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const now = new Date();
    const sessions = await this.prisma.authSession.findMany({
      where: { userId, revokedAt: null },
      select: { id: true },
    });
    await this.prisma.$transaction([
      this.prisma.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { session: { userId }, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    await this.sessionCache.markRevoked(sessions.map((session) => session.id));
  }

  private signAccessToken(user: User, sessionId: string): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: sessionId,
      jti: randomUUID(),
    };
    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: ACCESS_TOKEN_TTL,
      algorithm: 'HS256',
    });
  }

  private generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  /** Keyed hash so tokens are lookup-able by exact value but useless if the table leaks. */
  private hashRefreshToken(rawToken: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_REFRESH_SECRET'))
      .update(rawToken)
      .digest('hex');
  }

  private toSafeUser(user: User) {
    const { id, email, phone, role, status, firstName, lastName } = user;
    return { id, email, phone, role, status, firstName, lastName };
  }
}

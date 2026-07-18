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
import { MailService } from '@/modules/mail/mail.service';
import { PrismaService } from '@/prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './jwt.strategy';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export interface SessionMeta {
  ip?: string;
  userAgent?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
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
  ) {}

  /**
   * Creates a PENDING_VERIFICATION account and emails a single-use
   * verification link. The account can log in only after the link is used.
   */
  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    // DTO validation guarantees the format; normalization cannot fail here.
    const phone = normalizeBdPhone(dto.phone) as string;

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          phone,
          passwordHash: await argon2.hash(dto.password),
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: UserStatus.PENDING_VERIFICATION,
        },
        select: userSelect,
      });
    } catch (error) {
      // Unique indexes arbitrate concurrent registrations; a pre-check alone is race-prone.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target as string[] | undefined) ?? [];
        throw new ConflictException(
          target.includes('phone')
            ? 'Phone number is already registered'
            : 'Email is already registered',
        );
      }
      throw error;
    }

    await this.issueEmailVerification(user.id, user.email, user.firstName);
    return user;
  }

  /** Consumes a verification token and activates the account. */
  async verifyEmail(rawToken: string): Promise<void> {
    const now = new Date();
    const token = await this.prisma.verificationToken.findUnique({
      where: { tokenHash: this.hashVerificationToken(rawToken) },
      include: { user: { select: { id: true, status: true, deletedAt: true } } },
    });
    if (
      !token ||
      token.type !== VerificationTokenType.EMAIL_VERIFICATION ||
      token.expiresAt <= now ||
      token.user.deletedAt
    )
      throw new BadRequestException('Verification link is invalid or has expired');
    if (token.usedAt || token.user.status !== UserStatus.PENDING_VERIFICATION)
      throw new BadRequestException('This email address has already been verified');

    await this.prisma.$transaction(async (tx) => {
      // Atomic claim: a token can activate an account exactly once.
      const claimed = await tx.verificationToken.updateMany({
        where: { id: token.id, usedAt: null },
        data: { usedAt: now },
      });
      if (claimed.count === 0)
        throw new BadRequestException('This email address has already been verified');
      await tx.user.update({
        where: { id: token.userId },
        data: { status: UserStatus.ACTIVE, emailVerifiedAt: now },
      });
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

  async login(dto: LoginDto, meta: SessionMeta) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!user || user.deletedAt || !(await argon2.verify(user.passwordHash, dto.password)))
      throw new UnauthorizedException('Invalid email or password');
    if (user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException(
        user.status === UserStatus.SUSPENDED
          ? 'Account is suspended'
          : 'Please verify your email address before signing in',
      );

    const now = Date.now();
    const rawRefreshToken = this.generateRefreshToken();
    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        ip: meta.ip,
        userAgent: meta.userAgent?.slice(0, 512),
        expiresAt: new Date(now + REFRESH_TOKEN_TTL_MS),
        refreshTokens: {
          create: {
            tokenHash: this.hashRefreshToken(rawRefreshToken),
            familyId: randomUUID(),
            expiresAt: new Date(now + REFRESH_TOKEN_TTL_MS),
          },
        },
      },
      select: { id: true },
    });

    return {
      user: this.toSafeUser(user),
      accessToken: await this.signAccessToken(user, session.id),
      refreshToken: rawRefreshToken,
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
    if (!token) throw new UnauthorizedException('Invalid refresh token');

    if (token.usedAt || token.revokedAt) {
      await this.revokeTokenFamily(token.familyId, token.sessionId, now);
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const { session } = token;
    if (
      token.expiresAt <= now ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.deletedAt ||
      session.user.status !== UserStatus.ACTIVE
    )
      throw new UnauthorizedException('Invalid refresh token');

    const nextRefreshToken = await this.prisma.$transaction(async (tx) => {
      // Atomic claim: only one concurrent request can consume this token.
      const claimed = await tx.refreshToken.updateMany({
        where: { id: token.id, usedAt: null, revokedAt: null },
        data: { usedAt: now },
      });
      if (claimed.count === 0) throw new UnauthorizedException('Refresh token has been revoked');

      const raw = this.generateRefreshToken();
      const replacement = await tx.refreshToken.create({
        data: {
          sessionId: session.id,
          tokenHash: this.hashRefreshToken(raw),
          familyId: token.familyId,
          expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
        },
        select: { id: true },
      });
      await tx.refreshToken.update({
        where: { id: token.id },
        data: { replacedById: replacement.id },
      });
      await tx.authSession.update({
        where: { id: session.id },
        data: { lastSeenAt: now, expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS) },
      });
      return raw;
    });

    return {
      accessToken: await this.signAccessToken(session.user, session.id),
      refreshToken: nextRefreshToken,
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
  }

  /** Force-logout everywhere: used when an account is suspended or deleted. */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const now = new Date();
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

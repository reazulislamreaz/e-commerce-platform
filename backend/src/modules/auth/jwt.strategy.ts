import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role, UserStatus } from '@/generated/prisma/client';
import { USER_FACING } from '@/common/messages/user-facing-errors';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthSessionCacheService } from './auth-session-cache.service';
import { AuthUserCacheService } from './auth-user-cache.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  /** Auth session id, used for logout/revocation. */
  sid: string;
  jti: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly userCache: AuthUserCacheService,
    private readonly sessionCache: AuthSessionCacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      // Pin the symmetric algorithm so a token forged with a different `alg`
      // header (e.g. algorithm-confusion attempts) is rejected outright.
      algorithms: ['HS256'],
    });
  }

  /**
   * Confirms the user still exists and is active on every request, so a
   * suspension/deletion takes effect immediately instead of after token expiry.
   * The role is re-read from the database (or a short-lived Redis snapshot) to
   * prevent stale role claims.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Reject tokens whose session was revoked (logout, password reset/change,
    // refresh-token reuse) before the 15 minute access token would expire.
    if (await this.sessionCache.isRevoked(payload.sid)) {
      throw new UnauthorizedException(USER_FACING.SESSION_ENDED);
    }

    const cached = await this.userCache.get(payload.sub);
    if (cached) {
      if (cached.deletedAt || cached.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException(USER_FACING.ACCOUNT_INACTIVE);
      }
      return { ...payload, role: cached.role };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { role: true, status: true, deletedAt: true },
    });
    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(USER_FACING.ACCOUNT_INACTIVE);
    }
    await this.userCache.set(payload.sub, user);
    return { ...payload, role: user.role };
  }
}

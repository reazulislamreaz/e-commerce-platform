import { Injectable, Logger } from '@nestjs/common';
import { Role, UserStatus } from '@/generated/prisma/client';
import { RedisService } from '@/common/redis/redis.service';

const PREFIX = 'auth:user:';
/** Short TTL; status/role/delete paths also call {@link invalidate}. */
const TTL_SECONDS = 30;

export interface CachedAuthUser {
  role: Role;
  status: UserStatus;
  deletedAt: string | null;
}

/**
 * Caches the JwtStrategy user snapshot so authenticated traffic avoids a DB hit
 * on every request while still converging quickly after admin mutations.
 */
@Injectable()
export class AuthUserCacheService {
  private readonly logger = new Logger(AuthUserCacheService.name);

  constructor(private readonly redis: RedisService) {}

  async get(userId: string): Promise<CachedAuthUser | null> {
    try {
      return await this.redis.getJson<CachedAuthUser>(key(userId));
    } catch (error) {
      this.logger.warn(`Auth user cache get failed: ${String(error)}`);
      return null;
    }
  }

  async set(
    userId: string,
    snapshot: { role: Role; status: UserStatus; deletedAt: Date | null },
  ): Promise<void> {
    try {
      await this.redis.setJson(
        key(userId),
        {
          role: snapshot.role,
          status: snapshot.status,
          deletedAt: snapshot.deletedAt ? snapshot.deletedAt.toISOString() : null,
        } satisfies CachedAuthUser,
        TTL_SECONDS,
      );
    } catch (error) {
      this.logger.warn(`Auth user cache set failed: ${String(error)}`);
    }
  }

  async invalidate(userId: string): Promise<void> {
    try {
      await this.redis.del(key(userId));
    } catch (error) {
      this.logger.warn(`Auth user cache invalidate failed: ${String(error)}`);
    }
  }
}

function key(userId: string): string {
  return `${PREFIX}${userId}`;
}

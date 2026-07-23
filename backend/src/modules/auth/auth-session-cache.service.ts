import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/common/redis/redis.service';

const PREFIX = 'auth:revoked-sid:';
/**
 * Must outlive any access token issued before revocation. Access tokens live 15
 * minutes, so a ~16 minute marker guarantees a revoked session cannot be used
 * with a still-valid access token, after which the token expires on its own.
 */
const TTL_SECONDS = 16 * 60;

/**
 * Redis denylist of revoked auth sessions. Access tokens carry a session id
 * (`sid`); {@link JwtStrategy} consults this list so logout, password reset,
 * password change, and refresh-token reuse revoke the access token immediately
 * instead of after its 15 minute expiry.
 */
@Injectable()
export class AuthSessionCacheService {
  private readonly logger = new Logger(AuthSessionCacheService.name);

  constructor(private readonly redis: RedisService) {}

  async markRevoked(sessionIds: string[]): Promise<void> {
    for (const sessionId of sessionIds) {
      try {
        await this.redis.set(key(sessionId), '1', TTL_SECONDS);
      } catch (error) {
        this.logger.warn(`Session revoke marker failed for ${sessionId}: ${String(error)}`);
      }
    }
  }

  async isRevoked(sessionId: string): Promise<boolean> {
    try {
      return (await this.redis.get(key(sessionId))) !== null;
    } catch (error) {
      // Fail open: the refresh flow still enforces revocation from the database.
      this.logger.warn(`Session revoke lookup failed for ${sessionId}: ${String(error)}`);
      return false;
    }
  }
}

function key(sessionId: string): string {
  return `${PREFIX}${sessionId}`;
}

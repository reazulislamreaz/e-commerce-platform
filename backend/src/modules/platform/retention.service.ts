import { Injectable, Logger } from '@nestjs/common';
import { OutboxStatus } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Cleanup for expired tokens, sessions, idempotency keys,
 * processed outbox rows, and abandoned guest carts.
 * Invoked by the platform BullMQ scheduler (not per-process timers).
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async purgeExpired(now = new Date()): Promise<{
    verificationTokens: number;
    refreshTokens: number;
    authSessions: number;
    idempotencyKeys: number;
    outboxEvents: number;
    guestCarts: number;
  }> {
    const outboxCutoff = new Date(now.getTime() - 14 * DAY_MS);

    const [
      verificationTokens,
      refreshTokens,
      authSessions,
      idempotencyKeys,
      outboxEvents,
      guestCarts,
    ] = await Promise.all([
      this.prisma.verificationToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      this.prisma.refreshToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }],
        },
      }),
      this.prisma.authSession.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }],
        },
      }),
      this.prisma.idempotencyKey.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      this.prisma.outboxEvent.deleteMany({
        where: {
          status: OutboxStatus.PROCESSED,
          processedAt: { lt: outboxCutoff },
        },
      }),
      this.prisma.cart.deleteMany({
        where: {
          guestTokenHash: { not: null },
          expiresAt: { lt: now },
        },
      }),
    ]);

    const summary = {
      verificationTokens: verificationTokens.count,
      refreshTokens: refreshTokens.count,
      authSessions: authSessions.count,
      idempotencyKeys: idempotencyKeys.count,
      outboxEvents: outboxEvents.count,
      guestCarts: guestCarts.count,
    };

    const total = Object.values(summary).reduce((sum, n) => sum + n, 0);
    if (total > 0) {
      this.logger.log(summary, 'Retention purge completed');
    }

    return summary;
  }
}

import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '@/prisma/prisma.service';

export interface ReadinessResult {
  status: 'ok';
  checks: { database: 'up'; redis: 'up' };
}

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.redis = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  async readiness(): Promise<ReadinessResult> {
    const [database, redis] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.pingRedis(),
    ]);
    const failures: string[] = [];
    if (database.status === 'rejected') failures.push('database');
    if (redis.status === 'rejected') failures.push('redis');
    if (failures.length > 0)
      throw new ServiceUnavailableException(`Dependencies unavailable: ${failures.join(', ')}`);
    return { status: 'ok', checks: { database: 'up', redis: 'up' } };
  }

  private async pingRedis(): Promise<void> {
    if (this.redis.status !== 'ready') await this.redis.connect();
    await this.redis.ping();
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => this.redis.disconnect());
  }
}

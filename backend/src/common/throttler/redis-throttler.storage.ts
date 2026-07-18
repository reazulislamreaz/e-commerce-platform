import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';

/**
 * Redis-backed throttler storage so rate limits are shared across API instances.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleDestroy {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: 1,
      lazyConnect: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redisKey = `throttle:${throttlerName}:${key}`;
    const totalHits = await this.redis.incr(redisKey);
    if (totalHits === 1) {
      await this.redis.pexpire(redisKey, ttl);
    }
    const pttl = await this.redis.pttl(redisKey);
    const timeToExpire = pttl > 0 ? pttl : ttl;
    const isBlocked = totalHits > limit;
    let timeToBlockExpire = 0;
    if (isBlocked && blockDuration > 0) {
      const blockKey = `${redisKey}:block`;
      const blockHits = await this.redis.incr(blockKey);
      if (blockHits === 1) await this.redis.pexpire(blockKey, blockDuration);
      const blockTtl = await this.redis.pttl(blockKey);
      timeToBlockExpire = blockTtl > 0 ? blockTtl : blockDuration;
    }
    return {
      totalHits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire,
    };
  }
}

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Shared ioredis client for application caches (catalog, auth).
 * BullMQ and throttling keep their own connections.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: 1,
      lazyConnect: false,
      enableOfflineQueue: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, 'EX', ttlSeconds);
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.redis.del(...keys);
  }

  /** Deletes keys matching a prefix via SCAN (safe for production; avoids KEYS). */
  async delByPrefix(prefix: string): Promise<void> {
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) await this.redis.del(...keys);
    } while (cursor !== '0');
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      await this.del(key);
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }
}

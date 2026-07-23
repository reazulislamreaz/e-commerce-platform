import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/common/redis/redis.service';

const PREFIX = 'catalog:';
const FACETS_KEY = `${PREFIX}facets:v1`;
const PRODUCT_SLUG_PREFIX = `${PREFIX}product:slug:`;

/** Short TTL so stock/ratings stay near-live even if an invalidation is missed. */
export const PRODUCT_TTL_SECONDS = 30;
const FACETS_TTL_SECONDS = 5 * 60;
/** List/rail payloads carry per-variant stock, so keep them short-lived. */
export const LIST_TTL_SECONDS = 60;
export const RAIL_TTL_SECONDS = 120;

/** Single-flight lock: guards against cache stampede on cold/expired keys. */
const LOCK_TTL_SECONDS = 5;
const LOCK_WAIT_ATTEMPTS = 5;
const LOCK_WAIT_MS = 40;

/**
 * Redis read-through cache for hot public catalog payloads.
 * Invalidate via {@link invalidateAll} after admin catalog, inventory, or review writes.
 */
@Injectable()
export class CatalogCacheService {
  private readonly logger = new Logger(CatalogCacheService.name);

  constructor(private readonly redis: RedisService) {}

  async getFacets<T>(): Promise<T | null> {
    return this.redis.getJson<T>(FACETS_KEY);
  }

  async setFacets(value: unknown): Promise<void> {
    await this.safeSet(FACETS_KEY, value, FACETS_TTL_SECONDS);
  }

  async getProductBySlug<T>(slug: string): Promise<T | null> {
    return this.redis.getJson<T>(productSlugKey(slug));
  }

  async setProductBySlug(slug: string, value: unknown): Promise<void> {
    await this.safeSet(productSlugKey(slug), value, PRODUCT_TTL_SECONDS);
  }

  async invalidateAll(): Promise<void> {
    try {
      await this.redis.delByPrefix(PREFIX);
    } catch (error) {
      this.logger.warn(`Catalog cache invalidate failed: ${String(error)}`);
    }
  }

  /**
   * Read-through cache with single-flight protection. On a miss, exactly one
   * caller computes the value (via a short-lived Redis lock) while others wait
   * briefly for the result; Redis failures degrade to running the loader
   * directly so the request never fails because the cache is unavailable.
   */
  async getOrSet<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.safeGet<T>(key);
    if (cached !== null) return cached;

    const lockKey = `${key}:lock`;
    const acquired = await this.safeAcquireLock(lockKey);
    if (!acquired) {
      for (let attempt = 0; attempt < LOCK_WAIT_ATTEMPTS; attempt += 1) {
        await delay(LOCK_WAIT_MS);
        const value = await this.safeGet<T>(key);
        if (value !== null) return value;
      }
    }

    try {
      const fresh = await loader();
      await this.safeSet(key, fresh, ttlSeconds);
      return fresh;
    } finally {
      if (acquired) await this.safeDel(lockKey);
    }
  }

  private async safeGet<T>(key: string): Promise<T | null> {
    try {
      return await this.redis.getJson<T>(key);
    } catch (error) {
      this.logger.warn(`Catalog cache get failed for ${key}: ${String(error)}`);
      return null;
    }
  }

  private async safeAcquireLock(lockKey: string): Promise<boolean> {
    try {
      return await this.redis.setNx(lockKey, '1', LOCK_TTL_SECONDS);
    } catch (error) {
      this.logger.warn(`Catalog cache lock failed for ${lockKey}: ${String(error)}`);
      return false;
    }
  }

  private async safeDel(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(`Catalog cache del failed for ${key}: ${String(error)}`);
    }
  }

  private async safeSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setJson(key, value, ttlSeconds);
    } catch (error) {
      this.logger.warn(`Catalog cache set failed for ${key}: ${String(error)}`);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function productSlugKey(slug: string): string {
  return `${PRODUCT_SLUG_PREFIX}${encodeURIComponent(slug)}`;
}

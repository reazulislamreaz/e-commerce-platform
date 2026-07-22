import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/common/redis/redis.service';

const PREFIX = 'catalog:';
const FACETS_KEY = `${PREFIX}facets:v1`;
const PRODUCT_SLUG_PREFIX = `${PREFIX}product:slug:`;

/** Short TTL so stock/ratings stay near-live even if an invalidation is missed. */
const PRODUCT_TTL_SECONDS = 30;
const FACETS_TTL_SECONDS = 5 * 60;

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

  private async safeSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setJson(key, value, ttlSeconds);
    } catch (error) {
      this.logger.warn(`Catalog cache set failed for ${key}: ${String(error)}`);
    }
  }
}

function productSlugKey(slug: string): string {
  return `${PRODUCT_SLUG_PREFIX}${encodeURIComponent(slug)}`;
}

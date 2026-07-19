import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { CustomerMetricsService } from '@/modules/crm/customer-metrics.service';
import { WishlistRepository } from './wishlist.repository';
import type { WishlistResponseDto } from './dto/wishlist-response.dto';

@Injectable()
export class WishlistService {
  constructor(
    private readonly wishlist: WishlistRepository,
    private readonly customerMetrics: CustomerMetricsService,
  ) {}

  async getWishlist(userId: string): Promise<WishlistResponseDto> {
    const record = await this.wishlist.findByUserId(userId);
    if (!record) return { productIds: [] };
    return { productIds: record.items.map((item) => item.productId) };
  }

  async addProduct(userId: string, productId: string): Promise<WishlistResponseDto> {
    await this.requireActiveProduct(productId);
    const record = await this.findOrCreateWishlist(userId);
    await this.wishlist.addItem(record.id, productId);
    await this.syncWishlistMetrics(userId, 'WISHLIST_ITEM_ADDED', 'Saved an item to the wishlist', {
      productId,
    });
    return this.getWishlist(userId);
  }

  async removeProduct(userId: string, productId: string): Promise<WishlistResponseDto> {
    const record = await this.wishlist.findByUserId(userId);
    if (record) {
      await this.wishlist.removeItem(record.id, productId);
      await this.syncWishlistMetrics(
        userId,
        'WISHLIST_ITEM_REMOVED',
        'Removed an item from the wishlist',
        { productId },
      );
    }
    return this.getWishlist(userId);
  }

  async mergeProductIds(userId: string, productIds: string[]): Promise<WishlistResponseDto> {
    const uniqueIds = [...new Set(productIds)];
    if (uniqueIds.length === 0) return this.getWishlist(userId);

    const activeProducts = await this.wishlist.findActiveProducts(uniqueIds);
    const activeIds = activeProducts.map((product) => product.id);
    if (activeIds.length === 0) return this.getWishlist(userId);

    const before = await this.getWishlist(userId);
    const record = await this.findOrCreateWishlist(userId);
    await this.wishlist.addMany(record.id, activeIds);
    const after = await this.getWishlist(userId);
    if (after.productIds.length !== before.productIds.length) {
      await this.syncWishlistMetrics(
        userId,
        'WISHLIST_MERGED',
        'Updated saved items on the wishlist',
        { addedCount: after.productIds.length - before.productIds.length },
      );
    }
    return after;
  }

  private async findOrCreateWishlist(userId: string) {
    const existing = await this.wishlist.findByUserId(userId);
    if (existing) return existing;

    const anyRecord = await this.wishlist.findAnyByUserId(userId);
    if (anyRecord) return this.wishlist.restore(anyRecord.id);

    return this.wishlist.create(userId);
  }

  private async requireActiveProduct(productId: string): Promise<void> {
    const product = await this.wishlist.findActiveProduct(productId);
    if (!product) throw new NotFoundException('Product not found');
  }

  private async syncWishlistMetrics(
    userId: string,
    eventType: string,
    title: string,
    metadata: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.customerMetrics.recordActivity(
      userId,
      eventType,
      title,
      '/wishlist',
      metadata,
    );
    await this.customerMetrics.recomputeForUser(userId);
  }
}

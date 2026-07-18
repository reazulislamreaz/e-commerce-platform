import { Injectable, NotFoundException } from '@nestjs/common';
import { WishlistRepository } from './wishlist.repository';
import type { WishlistResponseDto } from './dto/wishlist-response.dto';

@Injectable()
export class WishlistService {
  constructor(private readonly wishlist: WishlistRepository) {}

  async getWishlist(userId: string): Promise<WishlistResponseDto> {
    const record = await this.wishlist.findByUserId(userId);
    if (!record) return { productIds: [] };
    return { productIds: record.items.map((item) => item.productId) };
  }

  async addProduct(userId: string, productId: string): Promise<WishlistResponseDto> {
    await this.requireActiveProduct(productId);
    const record = await this.findOrCreateWishlist(userId);
    await this.wishlist.addItem(record.id, productId);
    return this.getWishlist(userId);
  }

  async removeProduct(userId: string, productId: string): Promise<WishlistResponseDto> {
    const record = await this.wishlist.findByUserId(userId);
    if (record) await this.wishlist.removeItem(record.id, productId);
    return this.getWishlist(userId);
  }

  async mergeProductIds(userId: string, productIds: string[]): Promise<WishlistResponseDto> {
    const uniqueIds = [...new Set(productIds)];
    if (uniqueIds.length === 0) return this.getWishlist(userId);

    const activeProducts = await this.wishlist.findActiveProducts(uniqueIds);
    const activeIds = activeProducts.map((product) => product.id);
    if (activeIds.length === 0) return this.getWishlist(userId);

    const record = await this.findOrCreateWishlist(userId);
    await this.wishlist.addMany(record.id, activeIds);
    return this.getWishlist(userId);
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
}

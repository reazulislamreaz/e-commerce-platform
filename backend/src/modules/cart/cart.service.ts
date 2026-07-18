import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { poishaToTaka } from '@/common/utils/money';
import { generateOpaqueToken, sha256Hex } from '@/common/utils/hash';
import { InventoryService } from '@/modules/inventory/inventory.service';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { CartRepository, type ActiveVariantRecord, type CartWithItems } from './cart.repository';
import type { AddCartItemDto } from './dto/add-cart-item.dto';
import type { CartItemResponseDto, CartResponseDto } from './dto/cart-response.dto';

export const GUEST_CART_COOKIE = 'guest_cart';
export const GUEST_CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface GuestCartCookieResult {
  token: string;
  isNew: boolean;
}

@Injectable()
export class CartService {
  constructor(
    private readonly cart: CartRepository,
    private readonly inventory: InventoryService,
  ) {}

  async getCart(user: JwtPayload | undefined, guestToken?: string): Promise<CartResponseDto> {
    const record = await this.resolveCartForRead(user, guestToken);
    if (!record) return this.emptyCart();
    return this.toResponse(record);
  }

  async addItem(
    user: JwtPayload | undefined,
    guestToken: string | undefined,
    dto: AddCartItemDto,
  ): Promise<{ cart: CartResponseDto; guestCookie?: GuestCartCookieResult }> {
    const variant = await this.requireActiveVariant(dto.variantId);
    const stock = await this.stockForVariant(variant.id);
    if (stock <= 0) throw new BadRequestException('Variant is out of stock');

    const { cart: record, guestCookie } = await this.resolveOrCreateCartForWrite(user, guestToken);
    const existing = record.items.find((item) => item.variantId === dto.variantId);
    const quantity = this.capQuantity(Math.max((existing?.quantity ?? 0) + dto.quantity, 1), stock);

    await this.cart.upsertItem(record.id, {
      productId: variant.productId,
      variantId: variant.id,
      quantity,
      size: variant.size,
      color: variant.color,
    });
    await this.touchCart(record);

    const updated = await this.cart.findById(record.id);
    if (!updated) throw new NotFoundException('Cart not found');
    return { cart: await this.toResponse(updated), guestCookie };
  }

  async updateItem(
    user: JwtPayload | undefined,
    guestToken: string | undefined,
    variantId: string,
    quantity: number,
  ): Promise<{ cart: CartResponseDto; guestCookie?: GuestCartCookieResult }> {
    if (quantity === 0) {
      const { cart: record, guestCookie } = await this.resolveExistingCartForWrite(user, guestToken);
      if (!record) return { cart: this.emptyCart(), guestCookie };

      const existing = record.items.find((item) => item.variantId === variantId);
      if (existing) await this.cart.deleteItem(record.id, variantId);
      await this.touchCart(record);

      const updated = await this.cart.findById(record.id);
      if (!updated) throw new NotFoundException('Cart not found');
      return { cart: await this.toResponse(updated), guestCookie };
    }

    const variant = await this.requireActiveVariant(variantId);
    const stock = await this.stockForVariant(variant.id);
    if (stock <= 0) throw new BadRequestException('Variant is out of stock');

    const { cart: record, guestCookie } = await this.resolveOrCreateCartForWrite(user, guestToken);
    const capped = this.capQuantity(quantity, stock);
    await this.cart.upsertItem(record.id, {
      productId: variant.productId,
      variantId: variant.id,
      quantity: capped,
      size: variant.size,
      color: variant.color,
    });
    await this.touchCart(record);

    const updated = await this.cart.findById(record.id);
    if (!updated) throw new NotFoundException('Cart not found');
    return { cart: await this.toResponse(updated), guestCookie };
  }

  async removeItem(
    user: JwtPayload | undefined,
    guestToken: string | undefined,
    variantId: string,
  ): Promise<{ cart: CartResponseDto; guestCookie?: GuestCartCookieResult }> {
    const { cart: record, guestCookie } = await this.resolveExistingCartForWrite(user, guestToken);
    if (!record) return { cart: this.emptyCart(), guestCookie };
    await this.cart.deleteItem(record.id, variantId);
    await this.touchCart(record);

    const updated = await this.cart.findById(record.id);
    if (!updated) throw new NotFoundException('Cart not found');
    return { cart: await this.toResponse(updated), guestCookie };
  }

  async clearCart(
    user: JwtPayload | undefined,
    guestToken: string | undefined,
  ): Promise<{ cart: CartResponseDto; guestCookie?: GuestCartCookieResult }> {
    const { cart: record, guestCookie } = await this.resolveExistingCartForWrite(user, guestToken);
    if (!record) return { cart: this.emptyCart(), guestCookie };
    await this.cart.deleteAllItems(record.id);
    await this.touchCart(record);

    const updated = await this.cart.findById(record.id);
    if (!updated) throw new NotFoundException('Cart not found');
    return { cart: await this.toResponse(updated), guestCookie };
  }

  async mergeGuestIntoUser(
    userId: string,
    guestToken: string | undefined,
  ): Promise<CartResponseDto> {
    if (!guestToken) return this.getOrCreateUserCartResponse(userId);

    const guestHash = sha256Hex(guestToken);
    const guestCart = await this.cart.findByGuestTokenHash(guestHash);
    if (!guestCart) return this.getOrCreateUserCartResponse(userId);

    let userCart = await this.cart.findByUserId(userId);
    if (!userCart) userCart = await this.cart.createUserCart(userId);

    const variantIds = guestCart.items.map((item) => item.variantId);
    const stockMap = await this.inventory.getAvailableByVariantIds(variantIds);

    for (const guestItem of guestCart.items) {
      const available = stockMap.get(guestItem.variantId) ?? 0;
      const userItem = userCart.items.find((item) => item.variantId === guestItem.variantId);
      const merged = this.mergeLineQuantities(userItem?.quantity ?? 0, guestItem.quantity, available);

      if (merged <= 0) {
        if (userItem) await this.cart.deleteItem(userCart.id, guestItem.variantId);
        continue;
      }

      await this.cart.upsertItem(userCart.id, {
        productId: guestItem.productId,
        variantId: guestItem.variantId,
        quantity: merged,
        size: guestItem.size,
        color: guestItem.color,
      });
    }

    await this.cart.deleteCart(guestCart.id);
    await this.touchCart(userCart);

    const updated = await this.cart.findByUserId(userId);
    if (!updated) throw new NotFoundException('Cart not found');
    return this.toResponse(updated);
  }

  /** Sum guest and user line quantities, capped at available stock. Exported for unit tests. */
  mergeLineQuantities(userQty: number, guestQty: number, availableStock: number): number {
    if (availableStock <= 0) return userQty > 0 ? Math.min(userQty, availableStock) : 0;
    return this.capQuantity(userQty + guestQty, availableStock);
  }

  capQuantity(quantity: number, availableStock: number): number {
    return Math.min(Math.max(quantity, 0), availableStock);
  }

  private async getOrCreateUserCartResponse(userId: string): Promise<CartResponseDto> {
    let record = await this.cart.findByUserId(userId);
    if (!record) record = await this.cart.createUserCart(userId);
    return this.toResponse(record);
  }

  private async resolveCartForRead(
    user: JwtPayload | undefined,
    guestToken?: string,
  ): Promise<CartWithItems | null> {
    if (user?.sub) return this.cart.findByUserId(user.sub);
    if (guestToken) return this.cart.findByGuestTokenHash(sha256Hex(guestToken));
    return null;
  }

  private async resolveExistingCartForWrite(
    user: JwtPayload | undefined,
    guestToken?: string,
  ): Promise<{ cart: CartWithItems | null; guestCookie?: GuestCartCookieResult }> {
    return this.resolveCartForWrite(user, guestToken, false);
  }

  private async resolveOrCreateCartForWrite(
    user: JwtPayload | undefined,
    guestToken?: string,
  ): Promise<{ cart: CartWithItems; guestCookie?: GuestCartCookieResult }> {
    const result = await this.resolveCartForWrite(user, guestToken, true);
    if (!result.cart) throw new Error('Cart could not be resolved');
    return { cart: result.cart, guestCookie: result.guestCookie };
  }

  private async resolveCartForWrite(
    user: JwtPayload | undefined,
    guestToken?: string,
    createIfMissing = true,
  ): Promise<{ cart: CartWithItems | null; guestCookie?: GuestCartCookieResult }> {
    if (user?.sub) {
      let record = await this.cart.findByUserId(user.sub);
      if (!record && createIfMissing) record = await this.cart.createUserCart(user.sub);
      return { cart: record };
    }

    if (guestToken) {
      const hash = sha256Hex(guestToken);
      const existing = await this.cart.findByGuestTokenHash(hash);
      if (existing) return { cart: existing };
    }

    if (!createIfMissing) return { cart: null };

    const token = generateOpaqueToken();
    const record = await this.cart.createGuestCart(sha256Hex(token), this.guestExpiresAt());
    return { cart: record, guestCookie: { token, isNew: true } };
  }

  private async requireActiveVariant(variantId: string): Promise<ActiveVariantRecord> {
    const variant = await this.cart.findActiveVariant(variantId);
    if (!variant) throw new NotFoundException('Variant not found');
    return variant;
  }

  private async stockForVariant(variantId: string): Promise<number> {
    const stockMap = await this.inventory.getAvailableByVariantIds([variantId]);
    return stockMap.get(variantId) ?? 0;
  }

  private async touchCart(record: CartWithItems): Promise<void> {
    const expiresAt = record.userId ? null : this.guestExpiresAt();
    await this.cart.touchCart(record.id, expiresAt);
  }

  private guestExpiresAt(): Date {
    return new Date(Date.now() + GUEST_CART_TTL_MS);
  }

  private emptyCart(): CartResponseDto {
    return { id: null, version: 0, items: [] };
  }

  private async toResponse(record: CartWithItems): Promise<CartResponseDto> {
    const variantIds = record.items.map((item) => item.variantId);
    const [stockMap, variants] = await Promise.all([
      this.inventory.getAvailableByVariantIds(variantIds),
      Promise.all(variantIds.map((id) => this.cart.findActiveVariant(id))),
    ]);
    const variantById = new Map(
      variants.filter((v): v is ActiveVariantRecord => v !== null).map((v) => [v.id, v]),
    );

    const items: CartItemResponseDto[] = record.items.flatMap((item) => {
      const variant = variantById.get(item.variantId);
      if (!variant) return [];
      const primaryMedia = variant.product.media[0];
      return [
        {
          productId: item.productId,
          variantId: item.variantId,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          availableStock: stockMap.get(item.variantId) ?? 0,
          unitPrice: poishaToTaka(variant.product.currentPriceAmount),
          name: variant.product.name,
          image: primaryMedia?.url,
        },
      ];
    });

    return { id: record.id, version: record.version, items };
  }
}

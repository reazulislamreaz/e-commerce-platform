import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

const cartWithItemsInclude = {
  items: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.CartInclude;

export type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartWithItemsInclude }>;

const activeVariantInclude = {
  product: {
    select: {
      id: true,
      name: true,
      currentPriceAmount: true,
      media: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true },
      },
    },
  },
} satisfies Prisma.ProductVariantInclude;

export type ActiveVariantRecord = Prisma.ProductVariantGetPayload<{
  include: typeof activeVariantInclude;
}>;

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<CartWithItems | null> {
    return this.prisma.cart.findUnique({
      where: { userId },
      include: cartWithItemsInclude,
    });
  }

  findByGuestTokenHash(guestTokenHash: string): Promise<CartWithItems | null> {
    return this.prisma.cart.findUnique({
      where: { guestTokenHash },
      include: cartWithItemsInclude,
    });
  }

  findById(cartId: string): Promise<CartWithItems | null> {
    return this.prisma.cart.findUnique({
      where: { id: cartId },
      include: cartWithItemsInclude,
    });
  }

  createUserCart(userId: string): Promise<CartWithItems> {
    return this.prisma.cart.create({
      data: { userId, expiresAt: null },
      include: cartWithItemsInclude,
    });
  }

  createGuestCart(guestTokenHash: string, expiresAt: Date): Promise<CartWithItems> {
    return this.prisma.cart.create({
      data: { guestTokenHash, expiresAt },
      include: cartWithItemsInclude,
    });
  }

  touchCart(cartId: string, expiresAt: Date | null): Promise<{ version: number }> {
    return this.prisma.cart.update({
      where: { id: cartId },
      data: {
        version: { increment: 1 },
        expiresAt,
      },
      select: { version: true },
    });
  }

  upsertItem(
    cartId: string,
    data: {
      productId: string;
      variantId: string;
      quantity: number;
      size: string;
      color: string;
    },
  ) {
    return this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId: data.variantId } },
      create: { cartId, ...data },
      update: { quantity: data.quantity },
    });
  }

  deleteItem(cartId: string, variantId: string) {
    return this.prisma.cartItem.deleteMany({
      where: { cartId, variantId },
    });
  }

  deleteAllItems(cartId: string) {
    return this.prisma.cartItem.deleteMany({ where: { cartId } });
  }

  deleteCart(cartId: string) {
    return this.prisma.cart.delete({ where: { id: cartId } });
  }

  findActiveVariant(variantId: string): Promise<ActiveVariantRecord | null> {
    return this.prisma.productVariant.findFirst({
      where: { id: variantId, isActive: true, deletedAt: null },
      include: activeVariantInclude,
    });
  }
}

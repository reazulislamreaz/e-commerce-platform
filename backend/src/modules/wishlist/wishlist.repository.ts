import { Injectable } from '@nestjs/common';
import { ProductStatus } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

const activeProductWhere = {
  status: ProductStatus.ACTIVE,
  deletedAt: null,
  publishedAt: { not: null },
};

@Injectable()
export class WishlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.wishlist.findFirst({
      where: { userId, deletedAt: null },
      include: {
        items: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  findAnyByUserId(userId: string) {
    return this.prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  create(userId: string) {
    return this.prisma.wishlist.create({
      data: { userId },
      include: {
        items: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  restore(wishlistId: string) {
    return this.prisma.wishlist.update({
      where: { id: wishlistId },
      data: { deletedAt: null },
      include: {
        items: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  findActiveProduct(productId: string) {
    return this.prisma.product.findFirst({
      where: { id: productId, ...activeProductWhere },
      select: { id: true },
    });
  }

  findActiveProducts(productIds: string[]) {
    return this.prisma.product.findMany({
      where: { id: { in: productIds }, ...activeProductWhere },
      select: { id: true },
    });
  }

  addItem(wishlistId: string, productId: string) {
    return this.prisma.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId, productId } },
      create: { wishlistId, productId },
      update: {},
    });
  }

  removeItem(wishlistId: string, productId: string) {
    return this.prisma.wishlistItem.deleteMany({
      where: { wishlistId, productId },
    });
  }

  addMany(wishlistId: string, productIds: string[]) {
    return this.prisma.wishlistItem.createMany({
      data: productIds.map((productId) => ({ wishlistId, productId })),
      skipDuplicates: true,
    });
  }
}

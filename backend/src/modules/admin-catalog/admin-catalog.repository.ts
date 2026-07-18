import { Injectable } from '@nestjs/common';
import {
  InventoryMovementType,
  Prisma,
  ProductStatus,
} from '@/generated/prisma/client';
import { computeDiscountProjection, poishaToTaka, takaToPoisha } from '@/common/utils/money';
import { PrismaService } from '@/prisma/prisma.service';
import type { CreateCollectionDto } from './dto/collection.dto';
import type { CreateBrandDto } from './dto/brand.dto';
import type { CreateCategoryDto } from './dto/category.dto';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ListAdminProductsQueryDto } from './dto/list-admin-products.query.dto';
import type { ListInventoryBalancesQueryDto } from './dto/inventory.dto';
import type { ListInventoryMovementsQueryDto } from './dto/inventory.dto';

const adminProductInclude = {
  brand: true,
  categories: { include: { category: true } },
  collections: { include: { collection: true } },
  colors: { orderBy: { position: 'asc' as const } },
  media: { orderBy: { position: 'asc' as const } },
  variants: {
    where: { deletedAt: null },
    orderBy: { position: 'asc' as const },
  },
  prices: {
    where: { validTo: null },
    orderBy: { validFrom: 'desc' as const },
    take: 1,
  },
} satisfies Prisma.ProductInclude;

export type AdminProductRecord = Prisma.ProductGetPayload<{
  include: typeof adminProductInclude;
}>;

@Injectable()
export class AdminCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(query: ListAdminProductsQueryDto) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      status: query.status,
      ...(query.q?.trim()
        ? {
            OR: [
              { name: { contains: query.q.trim(), mode: 'insensitive' } },
              { slug: { contains: query.q.trim(), mode: 'insensitive' } },
              { description: { contains: query.q.trim(), mode: 'insensitive' } },
              { brand: { name: { contains: query.q.trim(), mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const items = await this.prisma.product.findMany({
      where,
      include: {
        brand: true,
        variants: { where: { deletedAt: null }, select: { id: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > query.limit;
    const page = hasMore ? items.slice(0, query.limit) : items;
    return { items: page, hasMore };
  }

  findProductById(id: string): Promise<AdminProductRecord | null> {
    return this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: adminProductInclude,
    });
  }

  async createProduct(
    data: CreateProductDto & { slug: string },
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<AdminProductRecord> {
    const amount = takaToPoisha(data.price.amountTaka);
    const compareAtAmount =
      data.price.compareAtTaka != null ? takaToPoisha(data.price.compareAtTaka) : null;
    const { discountPercent, onSale } = computeDiscountProjection(amount, compareAtAmount);
    const now = new Date();

    const product = await tx.product.create({
      data: {
        brandId: data.brandId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        status: ProductStatus.DRAFT,
        primaryColor: data.primaryColor,
        currentPriceAmount: amount,
        currentCompareAtAmount: compareAtAmount,
        discountPercent,
        onSale,
        categories: {
          create: data.categoryIds.map((categoryId, index) => ({
            categoryId,
            isPrimary: index === 0,
          })),
        },
        collections: data.collectionIds?.length
          ? {
              create: data.collectionIds.map((collectionId, index) => ({
                collectionId,
                isPrimary: index === 0,
              })),
            }
          : undefined,
        colors: {
          create: data.colors.map((color, position) => ({
            name: color.name,
            hex: color.hex,
            position,
          })),
        },
        media: {
          create: data.media.map((item, index) => ({
            url: item.url,
            alt: item.alt,
            position: item.position ?? index,
            isPrimary: item.isPrimary ?? index === 0,
          })),
        },
        variants: {
          create: data.variants.map((variant, position) => ({
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            position,
          })),
        },
        prices: {
          create: {
            amount,
            compareAtAmount,
            validFrom: now,
          },
        },
      },
      include: adminProductInclude,
    });

    return product;
  }

  async updateProduct(
    id: string,
    data: Prisma.ProductUpdateInput & {
      categoryIds?: string[];
      collectionIds?: string[];
      colors?: Array<{ name: string; hex: string }>;
      variants?: Array<{ sku: string; size: string; color: string }>;
      media?: Array<{ url: string; alt: string; position?: number; isPrimary?: boolean }>;
    },
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<AdminProductRecord> {
    const {
      categoryIds,
      collectionIds,
      colors,
      variants,
      media,
      ...productData
    } = data;

    if (categoryIds) {
      await tx.productCategory.deleteMany({ where: { productId: id } });
      await tx.productCategory.createMany({
        data: categoryIds.map((categoryId, index) => ({
          productId: id,
          categoryId,
          isPrimary: index === 0,
        })),
      });
    }

    if (collectionIds) {
      await tx.productCollection.deleteMany({ where: { productId: id } });
      if (collectionIds.length > 0) {
        await tx.productCollection.createMany({
          data: collectionIds.map((collectionId, index) => ({
            productId: id,
            collectionId,
            isPrimary: index === 0,
          })),
        });
      }
    }

    if (colors) {
      await tx.productColor.deleteMany({ where: { productId: id } });
      await tx.productColor.createMany({
        data: colors.map((color, position) => ({
          productId: id,
          name: color.name,
          hex: color.hex,
          position,
        })),
      });
    }

    if (variants) {
      const incomingSkus = variants.map((variant) => variant.sku);
      await tx.productVariant.updateMany({
        where: { productId: id, sku: { notIn: incomingSkus }, deletedAt: null },
        data: { isActive: false, deletedAt: new Date() },
      });
      for (const [position, variant] of variants.entries()) {
        await tx.productVariant.upsert({
          where: { sku: variant.sku },
          create: {
            productId: id,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            position,
            isActive: true,
          },
          update: {
            productId: id,
            size: variant.size,
            color: variant.color,
            position,
            isActive: true,
            deletedAt: null,
          },
        });
      }
    }

    if (media) {
      await tx.productMedia.deleteMany({ where: { productId: id } });
      await tx.productMedia.createMany({
        data: media.map((item, index) => ({
          productId: id,
          url: item.url,
          alt: item.alt,
          position: item.position ?? index,
          isPrimary: item.isPrimary ?? index === 0,
        })),
      });
    }

    return tx.product.update({
      where: { id },
      data: productData,
      include: adminProductInclude,
    });
  }

  async setProductStatus(
    id: string,
    status: ProductStatus,
    publishedAt: Date | null,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<AdminProductRecord> {
    return tx.product.update({
      where: { id },
      data: { status, publishedAt },
      include: adminProductInclude,
    });
  }

  async addPriceWindow(
    productId: string,
    amountTaka: number,
    compareAtTaka: number | undefined,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<AdminProductRecord> {
    const amount = takaToPoisha(amountTaka);
    const compareAtAmount = compareAtTaka != null ? takaToPoisha(compareAtTaka) : null;
    const { discountPercent, onSale } = computeDiscountProjection(amount, compareAtAmount);
    const now = new Date();

    await tx.productPrice.updateMany({
      where: { productId, validTo: null },
      data: { validTo: now },
    });
    await tx.productPrice.create({
      data: {
        productId,
        amount,
        compareAtAmount,
        validFrom: now,
      },
    });

    return tx.product.update({
      where: { id: productId },
      data: {
        currentPriceAmount: amount,
        currentCompareAtAmount: compareAtAmount,
        discountPercent,
        onSale,
      },
      include: adminProductInclude,
    });
  }

  countPublishRequirements(productId: string, tx: Prisma.TransactionClient = this.prisma) {
    return Promise.all([
      tx.productVariant.count({
        where: { productId, isActive: true, deletedAt: null },
      }),
      tx.productMedia.count({ where: { productId } }),
      tx.productPrice.count({ where: { productId, validTo: null } }),
      tx.product.findUnique({
        where: { id: productId },
        select: { currentPriceAmount: true },
      }),
    ]);
  }

  listBrands() {
    return this.prisma.brand.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  findBrandById(id: string) {
    return this.prisma.brand.findFirst({ where: { id, deletedAt: null } });
  }

  createBrand(data: CreateBrandDto & { slug: string }) {
    return this.prisma.brand.create({ data });
  }

  updateBrand(id: string, data: Prisma.BrandUpdateInput) {
    return this.prisma.brand.update({ where: { id }, data });
  }

  softDeleteBrand(id: string) {
    return this.prisma.brand.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  listCategories() {
    return this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ parentId: 'asc' }, { position: 'asc' }, { name: 'asc' }],
    });
  }

  findCategoryById(id: string) {
    return this.prisma.category.findFirst({ where: { id, deletedAt: null } });
  }

  createCategory(data: CreateCategoryDto & { slug: string }) {
    return this.prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        parentId: data.parentId ?? null,
        position: data.position ?? 0,
      },
    });
  }

  updateCategory(id: string, data: Prisma.CategoryUpdateInput) {
    return this.prisma.category.update({ where: { id }, data });
  }

  softDeleteCategory(id: string) {
    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  listCollections() {
    return this.prisma.catalogCollection.findMany({
      where: { deletedAt: null },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
  }

  findCollectionById(id: string) {
    return this.prisma.catalogCollection.findFirst({ where: { id, deletedAt: null } });
  }

  createCollection(data: CreateCollectionDto & { slug: string }) {
    return this.prisma.catalogCollection.create({
      data: {
        name: data.name,
        slug: data.slug,
        position: data.position ?? 0,
      },
    });
  }

  updateCollection(id: string, data: Prisma.CatalogCollectionUpdateInput) {
    return this.prisma.catalogCollection.update({ where: { id }, data });
  }

  softDeleteCollection(id: string) {
    return this.prisma.catalogCollection.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async listInventoryBalances(query: ListInventoryBalancesQueryDto) {
    const where: Prisma.InventoryBalanceWhereInput = {
      ...(query.variantId ? { variantId: query.variantId } : {}),
      ...(query.locationId ? { locationId: query.locationId } : {}),
    };

    const items = await this.prisma.inventoryBalance.findMany({
      where,
      include: {
        variant: { select: { sku: true } },
        location: { select: { code: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > query.limit;
    return { items: hasMore ? items.slice(0, query.limit) : items, hasMore };
  }

  async listInventoryMovements(query: ListInventoryMovementsQueryDto) {
    const where: Prisma.InventoryMovementWhereInput = {
      ...(query.variantId ? { variantId: query.variantId } : {}),
      ...(query.cursor ? { id: { lt: BigInt(query.cursor) } } : {}),
    };

    const items = await this.prisma.inventoryMovement.findMany({
      where,
      orderBy: { id: 'desc' },
      take: query.limit + 1,
    });

    const hasMore = items.length > query.limit;
    return { items: hasMore ? items.slice(0, query.limit) : items, hasMore };
  }

  listInventoryLocations() {
    return this.prisma.inventoryLocation.findMany({
      orderBy: { code: 'asc' },
    });
  }

  findVariantById(id: string) {
    return this.prisma.productVariant.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findLocationById(id: string) {
    return this.prisma.inventoryLocation.findUnique({ where: { id } });
  }

  toProductSummary(product: AdminProductRecord) {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      status: product.status,
      brandName: product.brand.name,
      priceTaka: poishaToTaka(product.currentPriceAmount),
      variantCount: product.variants.length,
      publishedAt: product.publishedAt?.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  toProductDetail(product: AdminProductRecord) {
    const activePrice = product.prices[0];
    return {
      ...this.toProductSummary(product),
      description: product.description,
      primaryColor: product.primaryColor,
      categoryIds: product.categories.map(({ categoryId }) => categoryId),
      collectionIds: product.collections.map(({ collectionId }) => collectionId),
      colors: product.colors.map((color) => ({
        id: color.id,
        name: color.name,
        hex: color.hex,
        position: color.position,
      })),
      variants: product.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        position: variant.position,
        isActive: variant.isActive,
      })),
      media: product.media.map((item) => ({
        id: item.id,
        url: item.url,
        alt: item.alt,
        position: item.position,
        isPrimary: item.isPrimary,
      })),
      activePrice: activePrice
        ? {
            id: activePrice.id,
            amountTaka: poishaToTaka(activePrice.amount),
            ...(activePrice.compareAtAmount != null
              ? { compareAtTaka: poishaToTaka(activePrice.compareAtAmount) }
              : {}),
            validFrom: activePrice.validFrom.toISOString(),
            ...(activePrice.validTo ? { validTo: activePrice.validTo.toISOString() } : {}),
          }
        : undefined,
      isNew: product.isNew,
      featuredPosition: product.featuredPosition,
      onSale: product.onSale,
      discountPercent: product.discountPercent,
    };
  }

  toBalanceResponse(
    balance: Prisma.InventoryBalanceGetPayload<{
      include: { variant: { select: { sku: true } }; location: { select: { code: true } } };
    }>,
  ) {
    return {
      id: balance.id,
      variantId: balance.variantId,
      variantSku: balance.variant.sku,
      locationId: balance.locationId,
      locationCode: balance.location.code,
      onHand: balance.onHand,
      reserved: balance.reserved,
      available: Math.max(0, balance.onHand - balance.reserved),
      version: balance.version,
      updatedAt: balance.updatedAt.toISOString(),
    };
  }

  toMovementResponse(movement: {
    id: bigint;
    variantId: string;
    locationId: string;
    type: InventoryMovementType;
    quantity: number;
    balanceAfter: number;
    note: string | null;
    createdAt: Date;
  }) {
    return {
      id: movement.id.toString(),
      variantId: movement.variantId,
      locationId: movement.locationId,
      type: movement.type,
      quantity: movement.quantity,
      balanceAfter: movement.balanceAfter,
      note: movement.note,
      createdAt: movement.createdAt.toISOString(),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { InventoryMovementType, Prisma, ProductStatus } from '@/generated/prisma/client';
import { computeDiscountProjection, poishaToTaka, takaToPoisha } from '@/common/utils/money';
import { PrismaService } from '@/prisma/prisma.service';
import type { CreateCollectionDto } from './dto/collection.dto';
import type { CreateBrandDto } from './dto/brand.dto';
import type { CreateCategoryDto } from './dto/category.dto';
import type { CreateProductDto } from './dto/create-product.dto';
import {
  AdminProductSort,
  AdminStockFilter,
  type ListAdminProductsQueryDto,
} from './dto/list-admin-products.query.dto';
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

const adminProductListInclude = {
  brand: true,
  variants: { where: { deletedAt: null }, select: { id: true, sku: true } },
  media: {
    orderBy: [{ isPrimary: 'desc' as const }, { position: 'asc' as const }],
    take: 1,
    select: { url: true },
  },
  categories: {
    orderBy: { isPrimary: 'desc' as const },
    take: 1,
    select: { category: { select: { name: true } } },
  },
} satisfies Prisma.ProductInclude;

export type AdminProductListRecord = Prisma.ProductGetPayload<{
  include: typeof adminProductListInclude;
}>;

/** Filtered relation counts exclude soft-deleted products from taxonomy usage totals. */
const brandInclude = {
  _count: { select: { products: { where: { deletedAt: null } } } },
} satisfies Prisma.BrandInclude;

const categoryInclude = {
  _count: { select: { assignments: { where: { product: { deletedAt: null } } } } },
} satisfies Prisma.CategoryInclude;

const collectionInclude = {
  _count: { select: { assignments: { where: { product: { deletedAt: null } } } } },
} satisfies Prisma.CatalogCollectionInclude;

export type BrandRecord = Prisma.BrandGetPayload<{ include: typeof brandInclude }>;
export type CategoryRecord = Prisma.CategoryGetPayload<{ include: typeof categoryInclude }>;
export type CollectionRecord = Prisma.CatalogCollectionGetPayload<{
  include: typeof collectionInclude;
}>;

const listOrderBy: Record<AdminProductSort, Prisma.ProductOrderByWithRelationInput[]> = {
  [AdminProductSort.UPDATED_DESC]: [{ updatedAt: 'desc' }, { id: 'desc' }],
  [AdminProductSort.CREATED_DESC]: [{ createdAt: 'desc' }, { id: 'desc' }],
  [AdminProductSort.CREATED_ASC]: [{ createdAt: 'asc' }, { id: 'asc' }],
  [AdminProductSort.NAME_ASC]: [{ name: 'asc' }, { id: 'asc' }],
  [AdminProductSort.NAME_DESC]: [{ name: 'desc' }, { id: 'desc' }],
  [AdminProductSort.PRICE_ASC]: [{ currentPriceAmount: 'asc' }, { id: 'asc' }],
  [AdminProductSort.PRICE_DESC]: [{ currentPriceAmount: 'desc' }, { id: 'desc' }],
};

@Injectable()
export class AdminCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(query: ListAdminProductsQueryDto, pagination: { skip: number; take: number }) {
    const search = query.q?.trim();
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      status: query.status,
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(query.categoryId ? { categories: { some: { categoryId: query.categoryId } } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { brand: { name: { contains: search, mode: 'insensitive' } } },
              {
                variants: {
                  some: { deletedAt: null, sku: { contains: search, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
      ...(query.stock ? { id: { in: await this.productIdsForStockBucket(query.stock) } } : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: adminProductListInclude,
        orderBy: listOrderBy[query.sort ?? AdminProductSort.UPDATED_DESC],
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    const stockByVariant = await this.availableStockByVariantIds(
      items.flatMap((product) => product.variants.map((variant) => variant.id)),
    );
    return { items, total, stockByVariant };
  }

  /** Counts by lifecycle status plus product-level stock buckets for the stats header. */
  async productStats() {
    const [byStatus, [stockCounts]] = await Promise.all([
      this.prisma.product.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<Array<{ out_of_stock: bigint; low_stock: bigint }>>(Prisma.sql`
        WITH product_stock AS (
          SELECT p.id,
                 COALESCE(SUM(b."onHand" - b.reserved), 0)::integer AS available,
                 COALESCE(SUM(b."lowStockThreshold"), 0)::integer AS threshold
          FROM product p
          LEFT JOIN product_variant v
            ON v."productId" = p.id AND v."deletedAt" IS NULL AND v."isActive" = true
          LEFT JOIN inventory_balance b ON b."variantId" = v.id
          WHERE p."deletedAt" IS NULL AND p.status != 'ARCHIVED'
          GROUP BY p.id
        )
        SELECT COUNT(*) FILTER (WHERE available <= 0)::bigint AS out_of_stock,
               COUNT(*) FILTER (WHERE available > 0 AND available <= threshold)::bigint AS low_stock
        FROM product_stock
      `),
    ]);

    const statusCount = (status: ProductStatus) =>
      byStatus.find((row) => row.status === status)?._count._all ?? 0;

    return {
      active: statusCount(ProductStatus.ACTIVE),
      draft: statusCount(ProductStatus.DRAFT),
      archived: statusCount(ProductStatus.ARCHIVED),
      outOfStock: Number(stockCounts?.out_of_stock ?? 0n),
      lowStock: Number(stockCounts?.low_stock ?? 0n),
    };
  }

  /** Product ids whose aggregate available stock falls into the requested bucket. */
  private async productIdsForStockBucket(bucket: AdminStockFilter): Promise<string[]> {
    const condition =
      bucket === AdminStockFilter.OUT_OF_STOCK
        ? Prisma.sql`available <= 0`
        : bucket === AdminStockFilter.LOW_STOCK
          ? Prisma.sql`available > 0 AND available <= threshold`
          : Prisma.sql`available > threshold`;

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      WITH product_stock AS (
        SELECT p.id,
               COALESCE(SUM(b."onHand" - b.reserved), 0)::integer AS available,
               COALESCE(SUM(b."lowStockThreshold"), 0)::integer AS threshold
        FROM product p
        LEFT JOIN product_variant v
          ON v."productId" = p.id AND v."deletedAt" IS NULL AND v."isActive" = true
        LEFT JOIN inventory_balance b ON b."variantId" = v.id
        WHERE p."deletedAt" IS NULL
        GROUP BY p.id
      )
      SELECT id FROM product_stock WHERE ${condition}
    `);
    return rows.map((row) => row.id);
  }

  /** Batched available quantity per variant for the current page — avoids N+1. */
  private async availableStockByVariantIds(variantIds: string[]): Promise<Map<string, number>> {
    if (variantIds.length === 0) return new Map();
    const grouped = await this.prisma.inventoryBalance.groupBy({
      by: ['variantId'],
      where: { variantId: { in: [...new Set(variantIds)] } },
      _sum: { onHand: true, reserved: true },
    });
    return new Map(
      grouped.map((row) => [row.variantId, (row._sum.onHand ?? 0) - (row._sum.reserved ?? 0)]),
    );
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
    const { categoryIds, collectionIds, colors, variants, media, ...productData } = data;

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

  listBrands(): Promise<BrandRecord[]> {
    return this.prisma.brand.findMany({
      where: { deletedAt: null },
      include: brandInclude,
      orderBy: { name: 'asc' },
    });
  }

  findBrandById(id: string): Promise<BrandRecord | null> {
    return this.prisma.brand.findFirst({
      where: { id, deletedAt: null },
      include: brandInclude,
    });
  }

  createBrand(data: CreateBrandDto & { slug: string }): Promise<BrandRecord> {
    return this.prisma.brand.create({ data, include: brandInclude });
  }

  updateBrand(id: string, data: Prisma.BrandUpdateInput): Promise<BrandRecord> {
    return this.prisma.brand.update({ where: { id }, data, include: brandInclude });
  }

  softDeleteBrand(id: string) {
    return this.prisma.brand.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  listCategories(): Promise<CategoryRecord[]> {
    return this.prisma.category.findMany({
      where: { deletedAt: null },
      include: categoryInclude,
      orderBy: [{ parentId: 'asc' }, { position: 'asc' }, { name: 'asc' }],
    });
  }

  findCategoryById(id: string): Promise<CategoryRecord | null> {
    return this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: categoryInclude,
    });
  }

  createCategory(data: CreateCategoryDto & { slug: string }): Promise<CategoryRecord> {
    return this.prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        parentId: data.parentId ?? null,
        position: data.position ?? 0,
        isActive: data.isActive ?? true,
      },
      include: categoryInclude,
    });
  }

  updateCategory(id: string, data: Prisma.CategoryUpdateInput): Promise<CategoryRecord> {
    return this.prisma.category.update({ where: { id }, data, include: categoryInclude });
  }

  softDeleteCategory(id: string) {
    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  listCollections(): Promise<CollectionRecord[]> {
    return this.prisma.catalogCollection.findMany({
      where: { deletedAt: null },
      include: collectionInclude,
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
  }

  findCollectionById(id: string): Promise<CollectionRecord | null> {
    return this.prisma.catalogCollection.findFirst({
      where: { id, deletedAt: null },
      include: collectionInclude,
    });
  }

  createCollection(data: CreateCollectionDto & { slug: string }): Promise<CollectionRecord> {
    return this.prisma.catalogCollection.create({
      data: {
        name: data.name,
        slug: data.slug,
        position: data.position ?? 0,
        isActive: data.isActive ?? true,
      },
      include: collectionInclude,
    });
  }

  updateCollection(
    id: string,
    data: Prisma.CatalogCollectionUpdateInput,
  ): Promise<CollectionRecord> {
    return this.prisma.catalogCollection.update({
      where: { id },
      data,
      include: collectionInclude,
    });
  }

  softDeleteCollection(id: string) {
    return this.prisma.catalogCollection.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async listInventoryBalances(
    query: ListInventoryBalancesQueryDto,
    pagination: { skip: number; take: number },
  ) {
    const where: Prisma.InventoryBalanceWhereInput = {
      ...(query.variantId ? { variantId: query.variantId } : {}),
      ...(query.locationId ? { locationId: query.locationId } : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.inventoryBalance.count({ where }),
      this.prisma.inventoryBalance.findMany({
        where,
        include: {
          variant: { select: { sku: true } },
          location: { select: { code: true } },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return { items, total };
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
    const primaryMedia = product.media.find((item) => item.isPrimary) ?? product.media[0];
    const primaryCategory =
      product.categories.find((item) => item.isPrimary) ?? product.categories[0];
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      status: product.status,
      brandName: product.brand.name,
      priceTaka: poishaToTaka(product.currentPriceAmount),
      variantCount: product.variants.length,
      imageUrl: primaryMedia?.url,
      sku: product.variants[0]?.sku,
      categoryName: primaryCategory?.category.name,
      publishedAt: product.publishedAt?.toISOString(),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  toProductListSummary(product: AdminProductListRecord, stockByVariant: Map<string, number>) {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      status: product.status,
      brandName: product.brand.name,
      priceTaka: poishaToTaka(product.currentPriceAmount),
      variantCount: product.variants.length,
      imageUrl: product.media[0]?.url,
      sku: product.variants[0]?.sku,
      categoryName: product.categories[0]?.category.name,
      totalStock: product.variants.reduce(
        (sum, variant) => sum + (stockByVariant.get(variant.id) ?? 0),
        0,
      ),
      publishedAt: product.publishedAt?.toISOString(),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  toProductDetail(product: AdminProductRecord) {
    const activePrice = product.prices[0];
    return {
      ...this.toProductSummary(product),
      brandId: product.brandId,
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

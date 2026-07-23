import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@/generated/prisma/client';
import { buildOffsetMeta, resolveOffsetPagination } from '@/common/pagination/offset-pagination';
import { slugify } from '@/common/utils/slug';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { AuditService } from '@/modules/platform/audit.service';
import { CatalogCacheService } from '@/modules/catalog/catalog-cache.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AdminCatalogRepository } from './admin-catalog.repository';
import type { BrandRecord, CategoryRecord, CollectionRecord } from './admin-catalog.repository';
import type { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import type { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';
import type { CreateProductDto } from './dto/create-product.dto';
import type { CreateProductPriceWindowDto } from './dto/create-product-price.dto';
import type { ListAdminProductsQueryDto } from './dto/list-admin-products.query.dto';
import type { InventoryAdjustmentDto } from './dto/inventory.dto';
import type {
  ListInventoryBalancesQueryDto,
  ListInventoryMovementsQueryDto,
  ListStockAlertsQueryDto,
} from './dto/inventory.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class AdminCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminCatalog: AdminCatalogRepository,
    private readonly inventory: InventoryService,
    private readonly audit: AuditService,
    private readonly catalogCache: CatalogCacheService,
  ) {}

  async listProducts(query: ListAdminProductsQueryDto) {
    const { page, pageSize, skip, take } = resolveOffsetPagination(query);
    const { items, total, stockByVariant } = await this.adminCatalog.listProducts(query, {
      skip,
      take,
    });
    return {
      data: items.map((product) => this.adminCatalog.toProductListSummary(product, stockByVariant)),
      meta: buildOffsetMeta(page, pageSize, total),
    };
  }

  async getProductStats() {
    const stats = await this.adminCatalog.productStats();
    return {
      total: stats.active + stats.draft + stats.archived,
      active: stats.active,
      draft: stats.draft,
      archived: stats.archived,
      outOfStock: stats.outOfStock,
      lowStock: stats.lowStock,
    };
  }

  async getProduct(id: string) {
    const product = await this.adminCatalog.findProductById(id);
    if (!product) throw new NotFoundException('Product not found');
    return this.adminCatalog.toProductDetail(product);
  }

  async createProduct(actor: JwtPayload, dto: CreateProductDto) {
    await this.assertBrandExists(dto.brandId);
    await this.assertCategoriesExist(dto.categoryIds);
    if (dto.collectionIds?.length) await this.assertCollectionsExist(dto.collectionIds);
    const openingVariants = dto.variants.filter((variant) => (variant.openingQuantity ?? 0) > 0);
    if (openingVariants.length > 0 && !dto.inventoryLocationId) {
      throw new BadRequestException(
        'An inventory location is required when opening quantity is provided',
      );
    }

    const slug = dto.slug?.trim() || slugify(dto.name);
    if (!slug) throw new BadRequestException('Product slug cannot be empty');

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const created = await this.adminCatalog.createProduct({ ...dto, slug }, tx);
        if (openingVariants.length > 0 && dto.inventoryLocationId) {
          const location = await tx.inventoryLocation.findUnique({
            where: { id: dto.inventoryLocationId },
            select: { isActive: true },
          });
          if (!location) throw new NotFoundException('Inventory location not found');
          if (!location.isActive) throw new BadRequestException('Inventory location is inactive');

          const variantsBySku = new Map(created.variants.map((variant) => [variant.sku, variant]));
          for (const input of openingVariants) {
            const variant = variantsBySku.get(input.sku);
            if (!variant) {
              throw new BadRequestException(`Created variant ${input.sku} could not be resolved`);
            }
            await this.inventory.adjust(
              {
                variantId: variant.id,
                locationId: dto.inventoryLocationId,
                quantityDelta: input.openingQuantity!,
                idempotencyKey: `opening:${created.id}:${variant.id}:${dto.inventoryLocationId}`,
                note: `Opening stock for ${input.sku}`,
              },
              tx,
            );
          }
        }
        await this.audit.write(
          {
            actorUserId: actor.sub,
            actorRole: actor.role,
            action: 'product.create',
            resourceType: 'product',
            resourceId: created.id,
            after: {
              status: ProductStatus.DRAFT,
              slug,
              openingStock: openingVariants.reduce(
                (total, variant) => total + (variant.openingQuantity ?? 0),
                0,
              ),
            },
          },
          tx,
        );
        return created;
      });
      await this.catalogCache.invalidateAll();
      return this.adminCatalog.toProductDetail(product);
    } catch (error) {
      this.rethrowUnique(error, 'Product slug or variant SKU already exists');
      throw error;
    }
  }

  async updateProduct(actor: JwtPayload, id: string, dto: UpdateProductDto) {
    const existing = await this.adminCatalog.findProductById(id);
    if (!existing) throw new NotFoundException('Product not found');

    if (dto.brandId) await this.assertBrandExists(dto.brandId);
    if (dto.categoryIds) await this.assertCategoriesExist(dto.categoryIds);
    if (dto.collectionIds) await this.assertCollectionsExist(dto.collectionIds);

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const updated = await this.adminCatalog.updateProduct(
          id,
          {
            ...(dto.name != null ? { name: dto.name } : {}),
            ...(dto.slug != null ? { slug: dto.slug } : {}),
            ...(dto.brandId != null ? { brand: { connect: { id: dto.brandId } } } : {}),
            ...(dto.description != null ? { description: dto.description } : {}),
            ...(dto.primaryColor != null ? { primaryColor: dto.primaryColor } : {}),
            ...(dto.featuredPosition != null ? { featuredPosition: dto.featuredPosition } : {}),
            ...(dto.isNew != null ? { isNew: dto.isNew } : {}),
            categoryIds: dto.categoryIds,
            collectionIds: dto.collectionIds,
            colors: dto.colors,
            variants: dto.variants,
            media: dto.media,
          },
          tx,
        );
        await this.audit.write(
          {
            actorUserId: actor.sub,
            actorRole: actor.role,
            action: 'product.update',
            resourceType: 'product',
            resourceId: id,
            before: { name: existing.name, slug: existing.slug },
            after: { name: updated.name, slug: updated.slug },
          },
          tx,
        );
        return updated;
      });
      await this.catalogCache.invalidateAll();
      return this.adminCatalog.toProductDetail(product);
    } catch (error) {
      this.rethrowUnique(error, 'Product slug or variant SKU already exists');
      throw error;
    }
  }

  async publishProduct(actor: JwtPayload, id: string) {
    return this.transitionProduct(actor, id, ProductStatus.ACTIVE, async (tx) => {
      await this.assertPublishable(id, tx);
      return new Date();
    });
  }

  async unpublishProduct(actor: JwtPayload, id: string) {
    return this.transitionProduct(actor, id, ProductStatus.DRAFT, async () => null);
  }

  async archiveProduct(actor: JwtPayload, id: string) {
    return this.transitionProduct(actor, id, ProductStatus.ARCHIVED, async () => null);
  }

  async addProductPrice(actor: JwtPayload, id: string, dto: CreateProductPriceWindowDto) {
    const existing = await this.adminCatalog.findProductById(id);
    if (!existing) throw new NotFoundException('Product not found');

    const product = await this.prisma.$transaction(async (tx) => {
      const updated = await this.adminCatalog.addPriceWindow(
        id,
        dto.amountTaka,
        dto.compareAtTaka,
        tx,
      );
      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: 'product.price.create',
          resourceType: 'product',
          resourceId: id,
          before: { priceTaka: Number(existing.currentPriceAmount) / 100 },
          after: { priceTaka: dto.amountTaka, compareAtTaka: dto.compareAtTaka ?? null },
        },
        tx,
      );
      return updated;
    });

    await this.catalogCache.invalidateAll();
    return this.adminCatalog.toProductDetail(product);
  }

  async listBrands() {
    const brands = await this.adminCatalog.listBrands();
    return brands.map((brand) => this.toBrandResponse(brand));
  }

  async getBrand(id: string) {
    const brand = await this.adminCatalog.findBrandById(id);
    if (!brand) throw new NotFoundException('Brand not found');
    return this.toBrandResponse(brand);
  }

  async createBrand(actor: JwtPayload, dto: CreateBrandDto) {
    const slug = dto.slug?.trim() || slugify(dto.name);
    if (!slug) throw new BadRequestException('Brand slug cannot be empty');
    try {
      const brand = await this.adminCatalog.createBrand({ ...dto, slug });
      await this.audit.write({
        actorUserId: actor.sub,
        actorRole: actor.role,
        action: 'brand.create',
        resourceType: 'brand',
        resourceId: brand.id,
        after: { name: brand.name, slug: brand.slug },
      });
      await this.catalogCache.invalidateAll();
      return this.toBrandResponse(brand);
    } catch (error) {
      this.rethrowUnique(error, 'Brand slug already exists');
      throw error;
    }
  }

  async updateBrand(actor: JwtPayload, id: string, dto: UpdateBrandDto) {
    const existing = await this.adminCatalog.findBrandById(id);
    if (!existing) throw new NotFoundException('Brand not found');
    try {
      const brand = await this.adminCatalog.updateBrand(id, dto);
      await this.audit.write({
        actorUserId: actor.sub,
        actorRole: actor.role,
        action: 'brand.update',
        resourceType: 'brand',
        resourceId: id,
        before: { name: existing.name, slug: existing.slug },
        after: { name: brand.name, slug: brand.slug },
      });
      await this.catalogCache.invalidateAll();
      return this.toBrandResponse(brand);
    } catch (error) {
      this.rethrowUnique(error, 'Brand slug already exists');
      throw error;
    }
  }

  async deleteBrand(actor: JwtPayload, id: string) {
    const existing = await this.adminCatalog.findBrandById(id);
    if (!existing) throw new NotFoundException('Brand not found');
    await this.adminCatalog.softDeleteBrand(id);
    await this.audit.write({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'brand.delete',
      resourceType: 'brand',
      resourceId: id,
      before: { name: existing.name },
    });
    await this.catalogCache.invalidateAll();
  }

  async listCategories() {
    const categories = await this.adminCatalog.listCategories();
    return categories.map((category) => this.toCategoryResponse(category));
  }

  async getCategory(id: string) {
    const category = await this.adminCatalog.findCategoryById(id);
    if (!category) throw new NotFoundException('Category not found');
    return this.toCategoryResponse(category);
  }

  async createCategory(actor: JwtPayload, dto: CreateCategoryDto) {
    const slug = dto.slug?.trim() || slugify(dto.name);
    if (!slug) throw new BadRequestException('Category slug cannot be empty');
    if (dto.parentId) {
      const parent = await this.adminCatalog.findCategoryById(dto.parentId);
      if (!parent) throw new NotFoundException('Parent category not found');
    }
    try {
      const category = await this.adminCatalog.createCategory({ ...dto, slug });
      await this.audit.write({
        actorUserId: actor.sub,
        actorRole: actor.role,
        action: 'category.create',
        resourceType: 'category',
        resourceId: category.id,
        after: { name: category.name, slug: category.slug },
      });
      await this.catalogCache.invalidateAll();
      return this.toCategoryResponse(category);
    } catch (error) {
      this.rethrowUnique(error, 'Category slug already exists');
      throw error;
    }
  }

  async updateCategory(actor: JwtPayload, id: string, dto: UpdateCategoryDto) {
    const existing = await this.adminCatalog.findCategoryById(id);
    if (!existing) throw new NotFoundException('Category not found');
    if (dto.parentId) {
      if (dto.parentId === id) throw new BadRequestException('Category cannot be its own parent');
      const parent = await this.adminCatalog.findCategoryById(dto.parentId);
      if (!parent) throw new NotFoundException('Parent category not found');
    }
    try {
      const category = await this.adminCatalog.updateCategory(id, {
        ...(dto.name != null ? { name: dto.name } : {}),
        ...(dto.slug != null ? { slug: dto.slug } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.position != null ? { position: dto.position } : {}),
        ...(dto.isActive != null ? { isActive: dto.isActive } : {}),
      });
      await this.audit.write({
        actorUserId: actor.sub,
        actorRole: actor.role,
        action: 'category.update',
        resourceType: 'category',
        resourceId: id,
        before: { name: existing.name, slug: existing.slug },
        after: { name: category.name, slug: category.slug },
      });
      await this.catalogCache.invalidateAll();
      return this.toCategoryResponse(category);
    } catch (error) {
      this.rethrowUnique(error, 'Category slug already exists');
      throw error;
    }
  }

  async deleteCategory(actor: JwtPayload, id: string) {
    const existing = await this.adminCatalog.findCategoryById(id);
    if (!existing) throw new NotFoundException('Category not found');
    await this.adminCatalog.softDeleteCategory(id);
    await this.audit.write({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'category.delete',
      resourceType: 'category',
      resourceId: id,
      before: { name: existing.name },
    });
    await this.catalogCache.invalidateAll();
  }

  async listCollections() {
    const collections = await this.adminCatalog.listCollections();
    return collections.map((collection) => this.toCollectionResponse(collection));
  }

  async getCollection(id: string) {
    const collection = await this.adminCatalog.findCollectionById(id);
    if (!collection) throw new NotFoundException('Collection not found');
    return this.toCollectionResponse(collection);
  }

  async createCollection(actor: JwtPayload, dto: CreateCollectionDto) {
    const slug = dto.slug?.trim() || slugify(dto.name);
    if (!slug) throw new BadRequestException('Collection slug cannot be empty');
    try {
      const collection = await this.adminCatalog.createCollection({ ...dto, slug });
      await this.audit.write({
        actorUserId: actor.sub,
        actorRole: actor.role,
        action: 'collection.create',
        resourceType: 'collection',
        resourceId: collection.id,
        after: { name: collection.name, slug: collection.slug },
      });
      await this.catalogCache.invalidateAll();
      return this.toCollectionResponse(collection);
    } catch (error) {
      this.rethrowUnique(error, 'Collection slug already exists');
      throw error;
    }
  }

  async updateCollection(actor: JwtPayload, id: string, dto: UpdateCollectionDto) {
    const existing = await this.adminCatalog.findCollectionById(id);
    if (!existing) throw new NotFoundException('Collection not found');
    try {
      const collection = await this.adminCatalog.updateCollection(id, dto);
      await this.audit.write({
        actorUserId: actor.sub,
        actorRole: actor.role,
        action: 'collection.update',
        resourceType: 'collection',
        resourceId: id,
        before: { name: existing.name, slug: existing.slug },
        after: { name: collection.name, slug: collection.slug },
      });
      await this.catalogCache.invalidateAll();
      return this.toCollectionResponse(collection);
    } catch (error) {
      this.rethrowUnique(error, 'Collection slug already exists');
      throw error;
    }
  }

  async deleteCollection(actor: JwtPayload, id: string) {
    const existing = await this.adminCatalog.findCollectionById(id);
    if (!existing) throw new NotFoundException('Collection not found');
    await this.adminCatalog.softDeleteCollection(id);
    await this.audit.write({
      actorUserId: actor.sub,
      actorRole: actor.role,
      action: 'collection.delete',
      resourceType: 'collection',
      resourceId: id,
      before: { name: existing.name },
    });
    await this.catalogCache.invalidateAll();
  }

  async listInventoryBalances(query: ListInventoryBalancesQueryDto) {
    const { page, pageSize, skip, take } = resolveOffsetPagination(query);
    const { items, total } = await this.adminCatalog.listInventoryBalances(query, { skip, take });
    return {
      data: items.map((balance) => this.adminCatalog.toBalanceResponse(balance)),
      meta: buildOffsetMeta(page, pageSize, total),
    };
  }

  async listInventoryMovements(query: ListInventoryMovementsQueryDto) {
    const { items, hasMore } = await this.adminCatalog.listInventoryMovements(query);
    return {
      data: items.map((movement) => this.adminCatalog.toMovementResponse(movement)),
      meta: {
        limit: query.limit,
        nextCursor: hasMore ? items[items.length - 1].id.toString() : null,
      },
    };
  }

  async listInventoryLocations() {
    const locations = await this.adminCatalog.listInventoryLocations();
    return locations.map((location) => ({
      id: location.id,
      code: location.code,
      name: location.name,
      isActive: location.isActive,
    }));
  }

  async listStockAlerts(query: ListStockAlertsQueryDto) {
    const { page, pageSize, skip, take } = resolveOffsetPagination(query);
    const { rows, total } = await this.inventory.listStockAlerts({
      resolved: false,
      skip,
      take,
    });
    return {
      data: rows.map((alert) => ({
        id: alert.id,
        level: alert.level,
        available: alert.available,
        threshold: alert.threshold,
        createdAt: alert.createdAt.toISOString(),
        variantId: alert.balance.variant.id,
        sku: alert.balance.variant.sku,
        size: alert.balance.variant.size,
        color: alert.balance.variant.color,
        locationId: alert.balance.location.id,
        locationCode: alert.balance.location.code,
        locationName: alert.balance.location.name,
        onHand: alert.balance.onHand,
        reserved: alert.balance.reserved,
      })),
      meta: buildOffsetMeta(page, pageSize, total),
    };
  }

  async adjustInventory(actor: JwtPayload, dto: InventoryAdjustmentDto) {
    const variant = await this.adminCatalog.findVariantById(dto.variantId);
    if (!variant) throw new NotFoundException('Variant not found');
    const location = await this.adminCatalog.findLocationById(dto.locationId);
    if (!location) throw new NotFoundException('Location not found');
    if (!location.isActive) throw new BadRequestException('Location is inactive');

    await this.prisma.$transaction(async (tx) => {
      await this.inventory.adjust(
        {
          variantId: dto.variantId,
          locationId: dto.locationId,
          quantityDelta: dto.quantityDelta,
          idempotencyKey: dto.idempotencyKey,
          note: dto.note,
          expectedVersion: dto.expectedVersion,
        },
        tx,
      );
      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: 'inventory.adjust',
          resourceType: 'inventory_balance',
          resourceId: `${dto.variantId}:${dto.locationId}`,
          after: {
            variantId: dto.variantId,
            locationId: dto.locationId,
            quantityDelta: dto.quantityDelta,
            idempotencyKey: dto.idempotencyKey,
          },
        },
        tx,
      );
    });

    await this.catalogCache.invalidateAll();
    return { success: true };
  }

  /** Validates publish prerequisites; exposed for unit tests. */
  async assertPublishable(productId: string, tx: Prisma.TransactionClient = this.prisma) {
    const [activeVariants, mediaCount, activePrices, product] =
      await this.adminCatalog.countPublishRequirements(productId, tx);

    if (activeVariants < 1) {
      throw new BadRequestException('Product must have at least one active variant to publish');
    }
    if (mediaCount < 1) {
      throw new BadRequestException('Product must have at least one media item to publish');
    }
    if (activePrices < 1 || !product || product.currentPriceAmount <= 0n) {
      throw new BadRequestException('Product must have an active price to publish');
    }
  }

  private async transitionProduct(
    actor: JwtPayload,
    id: string,
    status: ProductStatus,
    resolvePublishedAt: (tx: Prisma.TransactionClient) => Promise<Date | null>,
  ) {
    const existing = await this.adminCatalog.findProductById(id);
    if (!existing) throw new NotFoundException('Product not found');

    const product = await this.prisma.$transaction(async (tx) => {
      const publishedAt =
        status === ProductStatus.ACTIVE
          ? await resolvePublishedAt(tx)
          : status === ProductStatus.DRAFT
            ? null
            : existing.publishedAt;
      const updated = await this.adminCatalog.setProductStatus(id, status, publishedAt, tx);
      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: `product.${status.toLowerCase()}`,
          resourceType: 'product',
          resourceId: id,
          before: { status: existing.status },
          after: { status },
        },
        tx,
      );
      return updated;
    });

    await this.catalogCache.invalidateAll();
    return this.adminCatalog.toProductDetail(product);
  }

  private async assertBrandExists(id: string) {
    const brand = await this.adminCatalog.findBrandById(id);
    if (!brand) throw new NotFoundException('Brand not found');
  }

  private async assertCategoriesExist(ids: string[]) {
    const categories = await this.adminCatalog.listCategories();
    const known = new Set(categories.map((category) => category.id));
    if (ids.some((id) => !known.has(id))) {
      throw new NotFoundException('One or more categories were not found');
    }
  }

  private async assertCollectionsExist(ids: string[]) {
    const collections = await this.adminCatalog.listCollections();
    const known = new Set(collections.map((collection) => collection.id));
    if (ids.some((id) => !known.has(id))) {
      throw new NotFoundException('One or more collections were not found');
    }
  }

  private rethrowUnique(error: unknown, message: string) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(message);
    }
  }

  private toBrandResponse(brand: BrandRecord) {
    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      isActive: brand.isActive,
      productCount: brand._count.products,
      createdAt: brand.createdAt.toISOString(),
      updatedAt: brand.updatedAt.toISOString(),
    };
  }

  private toCategoryResponse(category: CategoryRecord) {
    return {
      id: category.id,
      parentId: category.parentId,
      name: category.name,
      slug: category.slug,
      position: category.position,
      isActive: category.isActive,
      productCount: category._count.assignments,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  private toCollectionResponse(collection: CollectionRecord) {
    return {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      position: collection.position,
      isActive: collection.isActive,
      productCount: collection._count.assignments,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
    };
  }
}

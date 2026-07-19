import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@/generated/prisma/client';
import { slugify } from '@/common/utils/slug';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { AuditService } from '@/modules/platform/audit.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AdminCatalogRepository } from './admin-catalog.repository';
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
} from './dto/inventory.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class AdminCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminCatalog: AdminCatalogRepository,
    private readonly inventory: InventoryService,
    private readonly audit: AuditService,
  ) {}

  async listProducts(query: ListAdminProductsQueryDto) {
    const { items, hasMore } = await this.adminCatalog.listProducts(query);
    return {
      data: items.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        status: product.status,
        brandName: product.brand.name,
        priceTaka: Number(product.currentPriceAmount) / 100,
        variantCount: product.variants.length,
        publishedAt: product.publishedAt?.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      })),
      meta: {
        limit: query.limit,
        nextCursor: hasMore ? items[items.length - 1].id : null,
      },
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

    const slug = dto.slug?.trim() || slugify(dto.name);
    if (!slug) throw new BadRequestException('Product slug cannot be empty');

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const created = await this.adminCatalog.createProduct({ ...dto, slug }, tx);
        await this.audit.write(
          {
            actorUserId: actor.sub,
            actorRole: actor.role,
            action: 'product.create',
            resourceType: 'product',
            resourceId: created.id,
            after: { status: ProductStatus.DRAFT, slug },
          },
          tx,
        );
        return created;
      });
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
  }

  async listInventoryBalances(query: ListInventoryBalancesQueryDto) {
    const { items, hasMore } = await this.adminCatalog.listInventoryBalances(query);
    return {
      data: items.map((balance) => this.adminCatalog.toBalanceResponse(balance)),
      meta: {
        limit: query.limit,
        nextCursor: hasMore ? items[items.length - 1].id : null,
      },
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

  async listStockAlerts(params?: { limit?: number }) {
    const alerts = await this.inventory.listStockAlerts({
      resolved: false,
      limit: params?.limit,
    });
    return alerts.map((alert) => ({
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
    }));
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

  private toBrandResponse(brand: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      createdAt: brand.createdAt.toISOString(),
      updatedAt: brand.updatedAt.toISOString(),
    };
  }

  private toCategoryResponse(category: {
    id: string;
    parentId: string | null;
    name: string;
    slug: string;
    position: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: category.id,
      parentId: category.parentId,
      name: category.name,
      slug: category.slug,
      position: category.position,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  private toCollectionResponse(collection: {
    id: string;
    name: string;
    slug: string;
    position: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      position: collection.position,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
    };
  }
}

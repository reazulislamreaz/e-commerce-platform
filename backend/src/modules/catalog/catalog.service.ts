import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { CatalogCacheService } from './catalog-cache.service';
import {
  CatalogRepository,
  type CatalogMappableProduct,
  type CatalogProductRecord,
} from './catalog.repository';
import type {
  ListProductsQueryDto,
  ProductLimitQueryDto,
  ProductSearchQueryDto,
} from './dto/list-products.query.dto';

function taka(poisha: bigint): number {
  return Number(poisha) / 100;
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly catalog: CatalogRepository,
    private readonly inventory: InventoryService,
    private readonly cache: CatalogCacheService,
  ) {}

  async list(query: ListProductsQueryDto) {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException('minPrice cannot exceed maxPrice');
    }
    const result = await this.catalog.list(query);
    return {
      data: await this.mapMany(result.items),
      meta: {
        page: result.page,
        pageSize: query.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  async search(query: ProductSearchQueryDto) {
    if (!query.q.trim()) return [];
    const result = await this.catalog.list({
      query: query.q,
      sort: 'featured',
      availability: 'all',
      page: 1,
      pageSize: query.limit,
    });
    return this.mapMany(result.items);
  }

  async newArrivals(query: ProductLimitQueryDto) {
    const result = await this.catalog.list({
      sort: 'newest',
      availability: 'all',
      page: 1,
      pageSize: query.limit,
      isNew: true,
    });
    return this.mapMany(result.items);
  }

  async onSale(query: ProductLimitQueryDto) {
    const result = await this.catalog.list({
      discount: true,
      sort: 'featured',
      availability: 'all',
      page: 1,
      pageSize: query.limit,
    });
    return this.mapMany(result.items);
  }

  async getBySlug(slug: string) {
    const cached =
      await this.cache.getProductBySlug<ReturnType<CatalogService['toResponse']>>(slug);
    if (cached) return cached;

    const product = await this.catalog.findBySlug(slug);
    if (!product) throw new NotFoundException('Product not found');
    const mapped = await this.mapOne(product);
    await this.cache.setProductBySlug(slug, mapped);
    return mapped;
  }

  async getByIdentifier(identifier: string) {
    const product = await this.catalog.findByIdentifier(identifier);
    if (!product) throw new NotFoundException('Product not found');
    return this.mapOne(product);
  }

  async getByIdentifiers(identifiers: string[]) {
    if (identifiers.length === 0) return [];
    const products = await this.catalog.findByIdentifiers([...new Set(identifiers)]);
    const mapped = await this.mapMany(products);
    const byIdentifier = new Map<string, (typeof mapped)[number]>();
    for (const product of mapped) {
      byIdentifier.set(product.id, product);
      if (product.legacyId) byIdentifier.set(product.legacyId, product);
    }
    return identifiers.flatMap((identifier) => {
      const product = byIdentifier.get(identifier);
      return product ? [product] : [];
    });
  }

  async related(slug: string, query: ProductLimitQueryDto) {
    const related = await this.catalog.findRelatedBySlug(slug, query.limit);
    if (related === null) throw new NotFoundException('Product not found');
    return this.mapMany(related);
  }

  async facets() {
    const cached = await this.cache.getFacets<{
      categories: string[];
      subcategories: string[];
      brands: string[];
      sizes: string[];
      colors: string[];
      minPrice: number;
      maxPrice: number;
    }>();
    if (cached) return cached;

    const facets = await this.catalog.facets();
    const mapped = {
      categories: facets.categories.map(({ name }) => name),
      subcategories: facets.subcategories.map(({ name }) => name),
      brands: facets.brands.map(({ name }) => name),
      sizes: facets.sizes.map(({ size }) => size),
      colors: facets.colors.map(({ name }) => name),
      minPrice: facets.priceRange._min.currentPriceAmount
        ? taka(facets.priceRange._min.currentPriceAmount)
        : 0,
      maxPrice: facets.priceRange._max.currentPriceAmount
        ? taka(facets.priceRange._max.currentPriceAmount)
        : 0,
    };
    await this.cache.setFacets(mapped);
    return mapped;
  }

  private async mapMany(products: CatalogMappableProduct[]) {
    const variantIds = products.flatMap((product) => product.variants.map(({ id }) => id));
    const availability = await this.inventory.getAvailableByVariantIds(variantIds);
    return products.map((product) => this.toResponse(product, availability));
  }

  private async mapOne(product: CatalogProductRecord) {
    const availability = await this.inventory.getAvailableByVariantIds(
      product.variants.map(({ id }) => id),
    );
    return this.toResponse(product, availability);
  }

  private toResponse(product: CatalogMappableProduct, availability: Map<string, number>) {
    const category = product.categories[0]?.category;
    const collection = product.collections[0]?.collection.slug;
    const media = product.media.map(({ url, alt }) => ({ url, alt }));
    const mediaUrls = media.map(({ url }) => url);
    const imageAlts = media.map(({ alt }) => alt || product.name);
    const variants = product.variants.map((variant) => ({
      id: variant.id,
      size: variant.size,
      color: variant.color,
      stock: availability.get(variant.id) ?? 0,
      sku: variant.sku,
    }));
    const reviews = product.reviews ?? [];
    return {
      id: product.id,
      ...(product.legacyKey ? { legacyId: product.legacyKey } : {}),
      name: product.name,
      slug: product.slug,
      price: taka(product.currentPriceAmount),
      ...(product.currentCompareAtAmount !== null
        ? { compareAtPrice: taka(product.currentCompareAtAmount) }
        : {}),
      category: category?.parent?.name ?? category?.name ?? '',
      subcategory: category?.name ?? '',
      brand: product.brand.name,
      collection: (collection ?? 'unisex') as 'men' | 'women' | 'kids' | 'unisex',
      color: product.primaryColor,
      colors: product.colors.map(({ name, hex }) => ({ name, hex })),
      sizes: [...new Set(product.variants.map(({ size }) => size))],
      image: mediaUrls[0] ?? '',
      images: mediaUrls,
      imageAlts,
      description: product.description,
      variants,
      inStock: variants.some(({ stock }) => stock > 0),
      rating: product.ratingAverage / 100,
      reviewCount: product.reviewCount,
      reviews: reviews.map((review) => ({
        id: review.id,
        author: review.authorName,
        rating: review.rating,
        title: review.title,
        body: review.body,
        createdAt: review.createdAt.toISOString().slice(0, 10),
        verified: review.verified,
      })),
      isNew: product.isNew,
      onSale: product.onSale,
    };
  }
}

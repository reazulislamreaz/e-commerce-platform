import { Injectable } from '@nestjs/common';
import { Prisma, ProductStatus, ReviewStatus } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { ListProductsQueryDto, ProductSort } from './dto/list-products.query.dto';

const productInclude = {
  brand: true,
  categories: {
    where: { isPrimary: true, category: { isActive: true, deletedAt: null } },
    include: { category: { include: { parent: true } } },
    take: 1,
  },
  collections: {
    where: { isPrimary: true, collection: { isActive: true, deletedAt: null } },
    include: { collection: true },
    take: 1,
  },
  colors: { orderBy: { position: 'asc' as const } },
  media: { orderBy: { position: 'asc' as const } },
  variants: {
    where: { isActive: true, deletedAt: null },
    orderBy: { position: 'asc' as const },
  },
  reviews: {
    where: { status: ReviewStatus.PUBLISHED, deletedAt: null },
    orderBy: { createdAt: 'desc' as const },
    take: 20,
  },
} satisfies Prisma.ProductInclude;

export type CatalogProductRecord = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

const activeProductWhere = {
  status: ProductStatus.ACTIVE,
  deletedAt: null,
  publishedAt: { not: null },
} satisfies Prisma.ProductWhereInput;

function moneyToPoisha(value: number): bigint {
  return BigInt(Math.round(value * 100));
}

function orderBy(sort: ProductSort): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'newest':
      return [{ isNew: 'desc' }, { publishedAt: 'desc' }, { id: 'asc' }];
    case 'price-asc':
      return [{ currentPriceAmount: 'asc' }, { id: 'asc' }];
    case 'price-desc':
      return [{ currentPriceAmount: 'desc' }, { id: 'asc' }];
    case 'rating':
      return [{ ratingAverage: 'desc' }, { id: 'asc' }];
    case 'discount':
      return [{ discountPercent: 'desc' }, { id: 'asc' }];
    case 'featured':
    default:
      return [{ featuredPosition: 'asc' }, { id: 'asc' }];
  }
}

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: ListProductsQueryDto): Prisma.ProductWhereInput {
    const and: Prisma.ProductWhereInput[] = [activeProductWhere];
    if (query.collections?.length) {
      and.push({
        collections: {
          some: {
            collection: {
              slug: { in: query.collections },
              isActive: true,
              deletedAt: null,
            },
          },
        },
      });
    }
    if (query.categories?.length) {
      and.push({
        categories: {
          some: {
            category: {
              isActive: true,
              deletedAt: null,
              parent: {
                name: { in: query.categories },
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
      });
    }
    if (query.subcategories?.length) {
      and.push({
        categories: {
          some: {
            category: {
              name: { in: query.subcategories },
              isActive: true,
              deletedAt: null,
            },
          },
        },
      });
    }
    if (query.brands?.length) {
      and.push({
        brand: { name: { in: query.brands }, isActive: true, deletedAt: null },
      });
    }
    if (query.sizes?.length) {
      and.push({
        variants: {
          some: { isActive: true, deletedAt: null, size: { in: query.sizes } },
        },
      });
    }
    if (query.colors?.length) {
      and.push({
        OR: [
          { primaryColor: { in: query.colors } },
          { colors: { some: { name: { in: query.colors } } } },
        ],
      });
    }
    if (query.minPrice !== undefined) {
      and.push({ currentPriceAmount: { gte: moneyToPoisha(query.minPrice) } });
    }
    if (query.maxPrice !== undefined) {
      and.push({ currentPriceAmount: { lte: moneyToPoisha(query.maxPrice) } });
    }
    if (query.discount) {
      and.push({ onSale: true, currentCompareAtAmount: { not: null } });
    }
    if (query.minRating !== undefined) {
      and.push({ ratingAverage: { gte: Math.round(query.minRating * 100) } });
    }
    if (query.query?.trim()) {
      const search = query.query.trim();
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { primaryColor: { contains: search, mode: 'insensitive' } },
          { brand: { name: { contains: search, mode: 'insensitive' } } },
          {
            categories: {
              some: { category: { name: { contains: search, mode: 'insensitive' } } },
            },
          },
        ],
      });
    }

    const hasAvailableVariant: Prisma.ProductWhereInput = {
      variants: {
        some: {
          isActive: true,
          deletedAt: null,
          inventoryBalances: {
            some: {
              location: { isActive: true },
              onHand: { gt: this.prisma.inventoryBalance.fields.reserved },
            },
          },
        },
      },
    };
    if (query.availability === 'in-stock') and.push(hasAvailableVariant);
    if (query.availability === 'out-of-stock') and.push({ NOT: hasAvailableVariant });
    return { AND: and };
  }

  async list(query: ListProductsQueryDto) {
    const where = this.buildWhere(query);
    const total = await this.prisma.product.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const items = await this.prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: orderBy(query.sort),
      skip: (page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return { items, total, page, totalPages };
  }

  findBySlug(slug: string): Promise<CatalogProductRecord | null> {
    return this.prisma.product.findFirst({
      where: { ...activeProductWhere, slug },
      include: productInclude,
    });
  }

  findByIdentifier(identifier: string): Promise<CatalogProductRecord | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      identifier,
    );
    return this.prisma.product.findFirst({
      where: {
        ...activeProductWhere,
        OR: [...(isUuid ? [{ id: identifier }] : []), { legacyKey: identifier }],
      },
      include: productInclude,
    });
  }

  findByIdentifiers(identifiers: string[]): Promise<CatalogProductRecord[]> {
    const uuidIds = identifiers.filter((identifier) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        identifier,
      ),
    );
    return this.prisma.product.findMany({
      where: {
        ...activeProductWhere,
        OR: [{ id: { in: uuidIds } }, { legacyKey: { in: identifiers } }],
      },
      include: productInclude,
    });
  }

  async findRelated(product: CatalogProductRecord, limit: number) {
    const categoryIds = product.categories.map(({ categoryId }) => categoryId);
    const collectionIds = product.collections.map(({ collectionId }) => collectionId);
    return this.prisma.product.findMany({
      where: {
        ...activeProductWhere,
        id: { not: product.id },
        OR: [
          { categories: { some: { categoryId: { in: categoryIds } } } },
          { collections: { some: { collectionId: { in: collectionIds } } } },
        ],
      },
      include: productInclude,
      orderBy: orderBy('featured'),
      take: limit,
    });
  }

  async facets() {
    const [categories, subcategories, brands, sizes, colors, priceRange] = await Promise.all([
      this.prisma.category.findMany({
        where: {
          parentId: null,
          isActive: true,
          deletedAt: null,
          children: {
            some: {
              isActive: true,
              deletedAt: null,
              assignments: { some: { product: activeProductWhere } },
            },
          },
        },
        select: { name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.findMany({
        where: {
          parentId: { not: null },
          isActive: true,
          deletedAt: null,
          parent: { isActive: true, deletedAt: null },
          assignments: { some: { product: activeProductWhere } },
        },
        select: { name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.brand.findMany({
        where: { isActive: true, deletedAt: null, products: { some: activeProductWhere } },
        select: { name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.productVariant.findMany({
        where: { isActive: true, deletedAt: null, product: activeProductWhere },
        distinct: ['size'],
        select: { size: true, position: true },
        orderBy: { position: 'asc' },
      }),
      this.prisma.productColor.findMany({
        where: { product: activeProductWhere },
        distinct: ['name'],
        select: { name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.aggregate({
        where: activeProductWhere,
        _min: { currentPriceAmount: true },
        _max: { currentPriceAmount: true },
      }),
    ]);
    return { categories, subcategories, brands, sizes, colors, priceRange };
  }
}

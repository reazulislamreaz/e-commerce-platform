import {
  InventoryMovementType,
  ProductStatus,
  ReviewStatus,
} from '../../../src/generated/prisma/client';
import { catalogProducts } from '../data/catalog';
import type { SeedContext } from '../types';
import { seedLog } from '../utils/logger';
import { slugify } from '../utils/slugify';

/**
 * Seeds the storefront catalog and opening stock from the frontend fixture.
 * Re-running refreshes catalog metadata; existing inventory balances are never
 * overwritten. Opening movements use stable idempotency keys.
 */
function resolveDescription(source: (typeof catalogProducts)[number]): string {
  const body = source.description?.trim() ?? '';
  const short = source.shortDescription?.trim();
  if (short && body && !body.startsWith(short)) {
    return `${short}\n\n${body}`;
  }
  return body || short || '';
}

export async function seedCatalog(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;

  const brandIds = new Map<string, string>();
  async function upsertBrand(name: string): Promise<string> {
    const slug = slugify(name);
    const cached = brandIds.get(slug);
    if (cached) return cached;
    const brand = await prisma.brand.upsert({
      where: { slug },
      create: { name, slug },
      update: { name, deletedAt: null, isActive: true },
    });
    brandIds.set(slug, brand.id);
    return brand.id;
  }

  await upsertBrand('Elevate Apparel');

  const location = await prisma.inventoryLocation.upsert({
    where: { code: 'MAIN' },
    create: { code: 'MAIN', name: 'Main Warehouse' },
    update: { name: 'Main Warehouse', isActive: true },
  });
  ctx.locationId = location.id;

  const collectionNames = { men: 'Men', women: 'Women', kids: 'Kids', unisex: 'Unisex' } as const;
  const collectionIds = new Map<string, string>();
  for (const [position, key] of (['men', 'women', 'kids', 'unisex'] as const).entries()) {
    const collection = await prisma.catalogCollection.upsert({
      where: { slug: key },
      create: { slug: key, name: collectionNames[key], position },
      update: { name: collectionNames[key], position, deletedAt: null, isActive: true },
    });
    collectionIds.set(key, collection.id);
  }

  for (const [featuredPosition, source] of catalogProducts.entries()) {
    const brandId = await upsertBrand(source.brand ?? 'Elevate Apparel');
    const parentSlug = slugify(source.category);
    const parent = await prisma.category.upsert({
      where: { slug: parentSlug },
      create: { name: source.category, slug: parentSlug, position: featuredPosition },
      update: { name: source.category, deletedAt: null, isActive: true },
    });
    const subcategoryName = source.subcategory ?? source.category;
    const leafSlug = `${parentSlug}-${slugify(subcategoryName)}`;
    const leaf = await prisma.category.upsert({
      where: { slug: leafSlug },
      create: {
        parentId: parent.id,
        name: subcategoryName,
        slug: leafSlug,
        position: featuredPosition,
      },
      update: {
        parentId: parent.id,
        name: subcategoryName,
        deletedAt: null,
        isActive: true,
      },
    });

    const description = resolveDescription(source);
    const existing = await prisma.product.findFirst({
      where: {
        OR: [{ slug: source.slug }, { legacyKey: source.id }],
      },
      select: { id: true, slug: true },
    });

    const productFields = {
      brandId,
      legacyKey: source.id,
      name: source.name,
      slug: source.slug,
      description,
      status: ProductStatus.ACTIVE,
      primaryColor: source.color,
      currentPriceAmount: BigInt(source.price * 100),
      currentCompareAtAmount:
        source.compareAtPrice === undefined ? null : BigInt(source.compareAtPrice * 100),
      discountPercent: source.compareAtPrice
        ? Math.round((1 - source.price / source.compareAtPrice) * 100)
        : 0,
      isNew: source.isNew ?? false,
      onSale: source.onSale ?? false,
      featuredPosition,
      ratingAverage: Math.round((source.rating ?? 0) * 100),
      reviewCount: source.reviewCount ?? 0,
      publishedAt: new Date(),
      deletedAt: null,
    };

    const product = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data: productFields,
        })
      : await prisma.product.create({
          data: productFields,
        });

    await prisma.$transaction([
      prisma.productCategory.deleteMany({ where: { productId: product.id } }),
      prisma.productCollection.deleteMany({ where: { productId: product.id } }),
    ]);
    await prisma.productCategory.create({
      data: { productId: product.id, categoryId: leaf.id, isPrimary: true },
    });
    const collectionId = collectionIds.get(source.collection);
    if (!collectionId) throw new Error(`Unknown collection ${source.collection}`);
    await prisma.productCollection.create({
      data: { productId: product.id, collectionId, isPrimary: true },
    });

    await prisma.$transaction([
      prisma.productColor.deleteMany({ where: { productId: product.id } }),
      prisma.productMedia.deleteMany({ where: { productId: product.id } }),
    ]);
    await prisma.productColor.createMany({
      data: (source.colors ?? [{ name: source.color, hex: '#111111' }]).map((color, position) => ({
        productId: product.id,
        name: color.name,
        hex: color.hex,
        position,
      })),
    });
    const mediaUrls = source.images?.length ? source.images : [source.image];
    await prisma.productMedia.createMany({
      data: mediaUrls.map((url, position) => ({
        productId: product.id,
        url,
        alt: source.imageAlts?.[position]?.trim() || source.name,
        position,
        isPrimary: position === 0,
      })),
    });

    const amount = BigInt(source.price * 100);
    const compareAtAmount =
      source.compareAtPrice === undefined ? null : BigInt(source.compareAtPrice * 100);
    const activePrice = await prisma.productPrice.findFirst({
      where: { productId: product.id, validTo: null },
      orderBy: { validFrom: 'desc' },
    });
    if (
      !activePrice ||
      activePrice.amount !== amount ||
      activePrice.compareAtAmount !== compareAtAmount
    ) {
      const now = new Date();
      await prisma.$transaction([
        prisma.productPrice.updateMany({
          where: { productId: product.id, validTo: null },
          data: { validTo: now },
        }),
        prisma.productPrice.create({
          data: {
            productId: product.id,
            amount,
            compareAtAmount,
            validFrom: now,
          },
        }),
      ]);
    }

    const sourceSkus = (source.variants ?? []).map((variant) => variant.sku);
    await prisma.productVariant.updateMany({
      where: { productId: product.id, sku: { notIn: sourceSkus } },
      data: { isActive: false },
    });
    for (const [position, sourceVariant] of (source.variants ?? []).entries()) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: sourceVariant.sku },
        create: {
          productId: product.id,
          sku: sourceVariant.sku,
          size: sourceVariant.size,
          color: sourceVariant.color,
          position,
        },
        update: {
          productId: product.id,
          size: sourceVariant.size,
          color: sourceVariant.color,
          position,
          isActive: true,
          deletedAt: null,
        },
      });
      await prisma.inventoryBalance.upsert({
        where: { variantId_locationId: { variantId: variant.id, locationId: location.id } },
        create: {
          variantId: variant.id,
          locationId: location.id,
          onHand: sourceVariant.stock,
        },
        update: {},
      });
      if (sourceVariant.stock > 0) {
        await prisma.inventoryMovement.upsert({
          where: { idempotencyKey: `seed:opening:v1:${sourceVariant.sku}` },
          create: {
            variantId: variant.id,
            locationId: location.id,
            type: InventoryMovementType.OPENING,
            quantity: sourceVariant.stock,
            balanceAfter: sourceVariant.stock,
            idempotencyKey: `seed:opening:v1:${sourceVariant.sku}`,
            note: 'Opening stock imported from frontend catalog fixture',
          },
          update: {},
        });
      }
    }

    for (const review of source.reviews ?? []) {
      await prisma.productReview.upsert({
        where: { sourceKey: review.id },
        create: {
          sourceKey: review.id,
          productId: product.id,
          authorName: review.author,
          rating: review.rating,
          title: review.title,
          body: review.body,
          verified: review.verified ?? false,
          status: ReviewStatus.PUBLISHED,
          publishedAt: new Date(`${review.createdAt}T00:00:00.000Z`),
          createdAt: new Date(`${review.createdAt}T00:00:00.000Z`),
        },
        update: {
          productId: product.id,
          authorName: review.author,
          rating: review.rating,
          title: review.title,
          body: review.body,
          verified: review.verified ?? false,
          status: ReviewStatus.PUBLISHED,
          publishedAt: new Date(`${review.createdAt}T00:00:00.000Z`),
          deletedAt: null,
        },
      });
    }
  }

  const fixtureSlugs = catalogProducts.map((product) => product.slug);
  const archived = await prisma.product.updateMany({
    where: {
      deletedAt: null,
      slug: { notIn: fixtureSlugs },
      legacyKey: { not: null },
    },
    data: {
      status: ProductStatus.ARCHIVED,
      deletedAt: new Date(),
    },
  });
  if (archived.count > 0) {
    seedLog(`Archived ${archived.count} legacy fixture products no longer in catalog.`);
  }

  seedLog(`Seeded ${catalogProducts.length} products and opening inventory.`);
}

import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import {
  InventoryMovementType,
  PrismaClient,
  ProductStatus,
  PromotionRewardType,
  PromotionStatus,
  ReviewStatus,
  Role,
  UserStatus,
} from '../src/generated/prisma/client';
import { catalogProducts } from '../../frontend/features/products/data';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/**
 * Seeds exactly one Super Admin. Idempotent: if any SUPER_ADMIN already
 * exists, the seed is a no-op. Credentials come from the environment so no
 * secret is committed.
 */
async function seedSuperAdmin(): Promise<void> {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  const rawPhone = process.env.SEED_SUPER_ADMIN_PHONE?.trim();
  if (!email || !password || !rawPhone) {
    throw new Error(
      'SEED_SUPER_ADMIN_EMAIL, SEED_SUPER_ADMIN_PASSWORD, and SEED_SUPER_ADMIN_PHONE must be set',
    );
  }
  if (password.length < 12) {
    throw new Error('SEED_SUPER_ADMIN_PASSWORD must be at least 12 characters');
  }
  const phoneMatch = /^(?:\+?880|0)(1[3-9]\d{8})$/.exec(rawPhone.replace(/[\s-]/g, ''));
  if (!phoneMatch) {
    throw new Error('SEED_SUPER_ADMIN_PHONE must be a valid Bangladeshi mobile number');
  }
  const phone = `+880${phoneMatch[1]}`;

  const existing = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN, deletedAt: null },
    select: { email: true },
  });
  if (existing) {
    console.info(`Super Admin already exists (${existing.email}); nothing to seed.`);
    return;
  }

  const superAdmin = await prisma.user.create({
    data: {
      email,
      phone,
      passwordHash: await argon2.hash(password),
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      firstName: 'Super',
      lastName: 'Admin',
    },
    select: { email: true },
  });
  console.info(`Seeded Super Admin ${superAdmin.email}.`);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Seeds the exact storefront catalog and opening stock from the frontend's
 * source-of-truth fixture. Re-running is safe: catalog metadata is refreshed,
 * while existing inventory balances are never overwritten.
 */
async function seedCatalog(): Promise<void> {
  const brand = await prisma.brand.upsert({
    where: { slug: 'elevate-apparel' },
    create: { name: 'Elevate Apparel', slug: 'elevate-apparel' },
    update: { name: 'Elevate Apparel', deletedAt: null },
  });
  const location = await prisma.inventoryLocation.upsert({
    where: { code: 'MAIN' },
    create: { code: 'MAIN', name: 'Main Warehouse' },
    update: { name: 'Main Warehouse', isActive: true },
  });

  const collectionNames = { men: 'Men', women: 'Women', unisex: 'Unisex' } as const;
  const collectionIds = new Map<string, string>();
  for (const [position, key] of (['men', 'women', 'unisex'] as const).entries()) {
    const collection = await prisma.catalogCollection.upsert({
      where: { slug: key },
      create: { slug: key, name: collectionNames[key], position },
      update: { name: collectionNames[key], position, deletedAt: null },
    });
    collectionIds.set(key, collection.id);
  }

  for (const [featuredPosition, source] of catalogProducts.entries()) {
    const parentSlug = slugify(source.category);
    const parent = await prisma.category.upsert({
      where: { slug: parentSlug },
      create: { name: source.category, slug: parentSlug, position: featuredPosition },
      update: { name: source.category, deletedAt: null },
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
      },
    });

    const product = await prisma.product.upsert({
      where: { slug: source.slug },
      create: {
        brandId: brand.id,
        legacyKey: source.id,
        name: source.name,
        slug: source.slug,
        description: source.description ?? '',
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
      },
      update: {
        brandId: brand.id,
        legacyKey: source.id,
        name: source.name,
        description: source.description ?? '',
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
      },
    });

    await prisma.productCategory.upsert({
      where: { productId_categoryId: { productId: product.id, categoryId: leaf.id } },
      create: { productId: product.id, categoryId: leaf.id, isPrimary: true },
      update: { isPrimary: true },
    });
    const collectionId = collectionIds.get(source.collection);
    if (!collectionId) throw new Error(`Unknown collection ${source.collection}`);
    await prisma.productCollection.upsert({
      where: { productId_collectionId: { productId: product.id, collectionId } },
      create: { productId: product.id, collectionId, isPrimary: true },
      update: { isPrimary: true },
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
    await prisma.productMedia.createMany({
      data: (source.images?.length ? source.images : [source.image]).map((url, position) => ({
        productId: product.id,
        url,
        alt: source.name,
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
        // Never overwrite live stock when the seed is re-run.
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

  console.info(`Seeded ${catalogProducts.length} products and opening inventory.`);
}

/**
 * Seeds storefront coupon codes matching the account UI fixtures, with
 * FREESHIP corrected to a free-shipping reward (no item discount).
 */
async function seedPromotions(): Promise<void> {
  const elevate = await prisma.promotion.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: '10% off first order',
      status: PromotionStatus.ACTIVE,
      rewardType: PromotionRewardType.PERCENT_OFF,
      percentOff: 10,
      minOrderPoisha: 150_000n,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
    },
    update: {
      name: '10% off first order',
      status: PromotionStatus.ACTIVE,
      rewardType: PromotionRewardType.PERCENT_OFF,
      percentOff: 10,
      fixedOffPoisha: null,
      minOrderPoisha: 150_000n,
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
      deletedAt: null,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'ELEVATE10' },
    create: {
      promotionId: elevate.id,
      code: 'ELEVATE10',
      title: '10% off your first order',
      description: 'Valid on orders over ৳1500. One-time use.',
      maxRedemptionsPerUser: 1,
    },
    update: {
      promotionId: elevate.id,
      title: '10% off your first order',
      description: 'Valid on orders over ৳1500. One-time use.',
      deletedAt: null,
    },
  });

  const freeship = await prisma.promotion.upsert({
    where: { id: '00000000-0000-4000-8000-000000000002' },
    create: {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Free shipping',
      status: PromotionStatus.ACTIVE,
      rewardType: PromotionRewardType.FREE_SHIPPING,
      minOrderPoisha: 0n,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-09-30T23:59:59.000Z'),
    },
    update: {
      name: 'Free shipping',
      status: PromotionStatus.ACTIVE,
      rewardType: PromotionRewardType.FREE_SHIPPING,
      percentOff: null,
      fixedOffPoisha: null,
      minOrderPoisha: 0n,
      endsAt: new Date('2026-09-30T23:59:59.000Z'),
      deletedAt: null,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'FREESHIP' },
    create: {
      promotionId: freeship.id,
      code: 'FREESHIP',
      title: 'Free shipping',
      description: 'Waives shipping on any order. One-time use.',
      maxRedemptionsPerUser: 1,
    },
    update: {
      promotionId: freeship.id,
      title: 'Free shipping',
      description: 'Waives shipping on any order. One-time use.',
      deletedAt: null,
    },
  });

  console.info('Seeded coupons ELEVATE10 and FREESHIP.');
}

async function main(): Promise<void> {
  await seedSuperAdmin();
  await seedCatalog();
  await seedPromotions();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

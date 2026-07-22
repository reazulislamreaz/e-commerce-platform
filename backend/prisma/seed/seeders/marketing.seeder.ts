import { BannerPlacement, BannerStatus } from '../../../src/generated/prisma/client';
import { seedUuid } from '../utils/ids';
import type { SeedContext } from '../types';
import { seedLog } from '../utils/logger';

const BANNERS = [
  {
    key: 'banner:home-hero',
    placement: BannerPlacement.HOME_HERO,
    title: 'URBAN SOPHISTICATION',
    subtitle: 'Premium Elevate shirts and accessories — redefine your everyday.',
    ctaLabel: 'SHOP NOW',
    ctaHref: '/shop',
    imageUrl: '/images/home/hero.webp',
    mobileImageUrl: '/images/home/hero-mobile.jpg',
    position: 0,
  },
  {
    key: 'banner:shop',
    placement: BannerPlacement.SHOP_BANNER,
    title: 'SHOP THE DROP',
    subtitle: 'Dress shirts, printed casuals, and leather essentials — stock updates live.',
    ctaLabel: 'VIEW ALL',
    ctaHref: '/shop',
    imageUrl: '/images/products/blue-essentials-stack.webp',
    position: 0,
  },
  {
    key: 'banner:sale',
    placement: BannerPlacement.SALE_BANNER,
    title: 'SALE EDIT',
    subtitle: 'Select Elevate styles marked down while stocks last.',
    ctaLabel: 'SHOP SALE',
    ctaHref: '/shop?onSale=true',
    imageUrl: '/images/products/urban-horizon-stripe.webp',
    position: 0,
  },
] as const;

export async function seedMarketing(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;
  const seededIds: string[] = [];
  for (const banner of BANNERS) {
    const id = seedUuid(banner.key);
    seededIds.push(id);
    await prisma.marketingBanner.upsert({
      where: { id },
      create: {
        id,
        placement: banner.placement,
        status: BannerStatus.ACTIVE,
        title: banner.title,
        subtitle: banner.subtitle,
        ctaLabel: banner.ctaLabel,
        ctaHref: banner.ctaHref,
        imageUrl: banner.imageUrl,
        mobileImageUrl: 'mobileImageUrl' in banner ? banner.mobileImageUrl : undefined,
        position: banner.position,
      },
      update: {
        placement: banner.placement,
        status: BannerStatus.ACTIVE,
        title: banner.title,
        subtitle: banner.subtitle,
        ctaLabel: banner.ctaLabel,
        ctaHref: banner.ctaHref,
        imageUrl: banner.imageUrl,
        mobileImageUrl: 'mobileImageUrl' in banner ? banner.mobileImageUrl : undefined,
        position: banner.position,
        deletedAt: null,
      },
    });
  }

  // Soft-delete demo banners that are no longer part of the fixture so
  // re-seeds never leave duplicate heroes/placements on the storefront.
  const placements = [...new Set(BANNERS.map((banner) => banner.placement))];
  await prisma.marketingBanner.updateMany({
    where: {
      deletedAt: null,
      placement: { in: placements },
      id: { notIn: seededIds },
    },
    data: { status: BannerStatus.ARCHIVED, deletedAt: new Date() },
  });

  seedLog(`Seeded ${BANNERS.length} marketing banners.`);
}

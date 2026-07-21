import { BannerPlacement, BannerStatus } from '../../../src/generated/prisma/client';
import { seedUuid } from '../utils/ids';
import type { SeedContext } from '../types';
import { seedLog } from '../utils/logger';

const BANNERS = [
  {
    key: 'banner:home-hero',
    placement: BannerPlacement.HOME_HERO,
    title: 'ELEVATE EVERYDAY',
    subtitle: 'Premium quality apparel designed to elevate your style.',
    ctaLabel: 'SHOP NOW',
    ctaHref: '/shop',
    imageUrl: '/images/home/hero.webp',
    position: 0,
  },
  {
    key: 'banner:shop',
    placement: BannerPlacement.SHOP_BANNER,
    title: 'SHOP THE DROP',
    subtitle: 'Filter by size, color, and collection — stock updates live.',
    ctaLabel: 'VIEW ALL',
    ctaHref: '/shop',
    imageUrl: '/images/home/instagram-4.webp',
    position: 0,
  },
  {
    key: 'banner:sale',
    placement: BannerPlacement.SALE_BANNER,
    title: 'SALE EDIT',
    subtitle: 'Select styles marked down while stocks last.',
    ctaLabel: 'SHOP SALE',
    ctaHref: '/shop?onSale=true',
    imageUrl: '/images/home/instagram-6.webp',
    position: 0,
  },
] as const;

export async function seedMarketing(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;
  for (const banner of BANNERS) {
    const id = seedUuid(banner.key);
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
        position: banner.position,
        deletedAt: null,
      },
    });
  }
  seedLog(`Seeded ${BANNERS.length} marketing banners.`);
}

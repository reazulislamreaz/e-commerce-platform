import type { BannerPlacement, MarketingBanner } from './types';

export function pickPrimaryBanner(
  banners: MarketingBanner[],
  fallback: MarketingBanner,
): MarketingBanner {
  return banners[0] ?? fallback;
}

export type PageHeroBannerProps = {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  description: string;
  image: string;
  mobileImage?: string;
  imageAlt: string;
  cta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
};

export function bannerToPageHero(
  banner: MarketingBanner,
  options?: { secondaryCta?: { href: string; label: string } },
): PageHeroBannerProps {
  const titleParts = banner.title.trim().split(/\s+/);
  const lead = titleParts.slice(0, -1).join(' ') || banner.title;
  const accent = titleParts.length > 1 ? titleParts[titleParts.length - 1] : undefined;
  const mobileImage =
    banner.mobileImageUrl && banner.mobileImageUrl !== banner.imageUrl
      ? banner.mobileImageUrl
      : undefined;

  return {
    eyebrow: banner.subtitle?.trim() ? 'Featured' : 'Elevate Apparel',
    title: accent ? lead : banner.title,
    titleAccent: accent,
    description:
      banner.subtitle?.trim() || 'Premium quality apparel designed to elevate your style.',
    image: banner.imageUrl,
    ...(mobileImage ? { mobileImage } : {}),
    imageAlt: banner.title,
    cta: banner.ctaHref
      ? { href: banner.ctaHref, label: banner.ctaLabel?.trim() || 'Shop Now' }
      : undefined,
    secondaryCta: options?.secondaryCta,
  };
}

export const FALLBACK_BANNERS: Record<Exclude<BannerPlacement, 'HOME_PROMO'>, MarketingBanner> = {
  HOME_HERO: {
    id: 'fallback-home-hero',
    placement: 'HOME_HERO',
    status: 'ACTIVE',
    title: 'ELEVATE EVERYDAY',
    subtitle: 'Premium quality apparel designed to elevate your style.',
    ctaLabel: 'SHOP NOW',
    ctaHref: '/shop',
    imageUrl: '/images/home/hero.webp',
    position: 0,
    createdAt: '',
    updatedAt: '',
  },
  SHOP_BANNER: {
    id: 'fallback-shop-banner',
    placement: 'SHOP_BANNER',
    status: 'ACTIVE',
    title: 'SHOP ALL',
    subtitle: 'Premium Elevate Apparel — tees, hoodies, joggers, and essentials.',
    ctaLabel: 'NEW ARRIVALS',
    ctaHref: '/new-arrivals',
    imageUrl: '/images/home/collection-men.webp',
    position: 0,
    createdAt: '',
    updatedAt: '',
  },
  SALE_BANNER: {
    id: 'fallback-sale-banner',
    placement: 'SALE_BANNER',
    status: 'ACTIVE',
    title: 'SALE UP TO 40% OFF',
    subtitle: 'Select essentials at sharper prices. Elevate more — spend less.',
    ctaLabel: 'SHOP ALL',
    ctaHref: '/shop',
    imageUrl: '/images/home/collection-sale.webp',
    position: 0,
    createdAt: '',
    updatedAt: '',
  },
};

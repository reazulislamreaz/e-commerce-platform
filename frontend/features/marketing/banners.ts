import type { BannerPlacement, MarketingBanner } from './types';

export type HeroSlide = {
  id: string;
  src: string;
  alt: string;
};

/** Primary portrait hero for the mobile carousel (first slide). */
export const MOBILE_HERO_IMAGE = '/images/home/hero-mobile.jpg';

export const FALLBACK_HERO_SLIDES: HeroSlide[] = [
  { id: 'fallback-hero-1', src: MOBILE_HERO_IMAGE, alt: 'Elevate Apparel urban rooftop hero' },
  {
    id: 'fallback-hero-2',
    src: '/images/products/blue-essentials-stack.webp',
    alt: 'Elevate blue essentials dress shirt collection',
  },
  {
    id: 'fallback-hero-3',
    src: '/images/products/patterned-collection-stack.webp',
    alt: 'Elevate patterned shirt new arrivals',
  },
];

export function bannerToHeroSlide(
  banner: MarketingBanner,
  options?: { preferMobileDefault?: boolean },
): HeroSlide {
  const src =
    banner.mobileImageUrl && banner.mobileImageUrl !== banner.imageUrl
      ? banner.mobileImageUrl
      : options?.preferMobileDefault
        ? MOBILE_HERO_IMAGE
        : banner.imageUrl;

  return {
    id: banner.id,
    src,
    alt: banner.title,
  };
}

export function pickHeroSlides(banners: MarketingBanner[], limit = 3): HeroSlide[] {
  const slides: HeroSlide[] = [];
  const usedSrcs = new Set<string>();

  for (const [index, banner] of banners.slice(0, limit).entries()) {
    const slide = bannerToHeroSlide(banner, { preferMobileDefault: index === 0 });
    if (!usedSrcs.has(slide.src)) {
      slides.push(slide);
      usedSrcs.add(slide.src);
    }
  }

  for (const fallback of FALLBACK_HERO_SLIDES) {
    if (slides.length >= limit) {
      break;
    }
    if (!usedSrcs.has(fallback.src)) {
      slides.push(fallback);
      usedSrcs.add(fallback.src);
    }
  }

  return slides.slice(0, limit);
}

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
    title: 'URBAN SOPHISTICATION',
    subtitle: 'Premium Elevate shirts and accessories — redefine your everyday.',
    ctaLabel: 'SHOP NOW',
    ctaHref: '/shop',
    imageUrl: '/images/home/hero.webp',
    mobileImageUrl: '/images/home/hero-mobile.jpg',
    position: 0,
    createdAt: '',
    updatedAt: '',
  },
  SHOP_BANNER: {
    id: 'fallback-shop-banner',
    placement: 'SHOP_BANNER',
    status: 'ACTIVE',
    title: 'SHOP ALL',
    subtitle: 'Premium Elevate Apparel — dress shirts, prints, and leather essentials.',
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
    subtitle: 'Select Elevate styles at sharper prices. Elevate more — spend less.',
    ctaLabel: 'SHOP ALL',
    ctaHref: '/shop',
    imageUrl: '/images/home/collection-sale.webp',
    position: 0,
    createdAt: '',
    updatedAt: '',
  },
};

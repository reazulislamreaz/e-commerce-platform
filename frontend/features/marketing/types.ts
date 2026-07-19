export type BannerPlacement = 'HOME_HERO' | 'HOME_PROMO' | 'SHOP_BANNER' | 'SALE_BANNER';
export type BannerStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'ARCHIVED';

export type MarketingBanner = {
  id: string;
  placement: BannerPlacement;
  status: BannerStatus;
  title: string;
  subtitle?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  imageUrl: string;
  mobileImageUrl?: string | null;
  position: number;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertBannerInput = {
  placement: BannerPlacement;
  status?: BannerStatus;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  position?: number;
  startsAt?: string;
  endsAt?: string | null;
};

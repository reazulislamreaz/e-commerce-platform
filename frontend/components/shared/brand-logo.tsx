import Image from 'next/image';
import { cn } from '@/lib/utils';

export const BRAND_LOGO = {
  /** Transparent — for `#FAFAFA` / white / light sections */
  onLight: '/images/brand/elevate-apparel-logo-on-light.webp',
  /** Transparent — for black / dark sections (footer, dark heroes) */
  onDark: '/images/brand/elevate-apparel-logo-on-dark.webp',
  /** Transparent monogram only (sidebar collapsed, compact chrome) */
  markOnLight: '/images/brand/elevate-apparel-mark-on-light.webp',
  markOnDark: '/images/brand/elevate-apparel-mark-on-dark.webp',
  /** 3D EA mark + Elevate wordmark — navbar (horizontal) and auth (stacked) */
  elevate3dHorizontal: '/images/brand/elevate-logo-nav-exact.webp',
  elevate3dStacked: '/images/brand/elevate-logo-stacked-3d.webp',
  elevate3dMark: '/images/brand/elevate-mark-3d.webp',
  width: 1248,
  height: 179,
  elevate3dHorizontalWidth: 544,
  elevate3dHorizontalHeight: 172,
  elevate3dStackedWidth: 631,
  elevate3dStackedHeight: 438,
  elevate3dMarkWidth: 141,
  elevate3dMarkHeight: 94,
} as const;

type BrandLogoProps = {
  /**
   * Background context for the logo artwork.
   * - `light` — dark ink + gold wordmark (navbar, auth, admin)
   * - `dark` — white + gold wordmark (footer, dark panels)
   */
  on?: 'light' | 'dark';
  /** Full wordmark (default) or monogram mark only */
  variant?: 'full' | 'mark';
  /**
   * Classic flat wordmark (default) or 3D EA mark + Elevate artwork.
   * Use `elevate3d` for navbar and auth surfaces.
   */
  style?: 'classic' | 'elevate3d';
  /** Layout for `elevate3d` — horizontal navbar row or stacked auth hero */
  layout?: 'horizontal' | 'stacked' | 'mark';
  className?: string;
  /** Tailwind height utility, e.g. `h-7` / `h-[37px]`. Width stays auto. */
  heightClassName?: string;
  priority?: boolean;
  quality?: number;
};

/**
 * Official Elevate Apparel logo — transparent background, two colorways only.
 * Never place inside a fixed black/white box; let the section background show through.
 */
export function BrandLogo({
  on = 'light',
  variant = 'full',
  style = 'classic',
  layout = 'horizontal',
  className,
  heightClassName = 'h-7',
  priority = false,
  quality = 90,
}: BrandLogoProps) {
  if (style === 'elevate3d') {
    const isMark = layout === 'mark';
    const isStacked = layout === 'stacked';
    const src = isMark
      ? BRAND_LOGO.elevate3dMark
      : isStacked
        ? BRAND_LOGO.elevate3dStacked
        : BRAND_LOGO.elevate3dHorizontal;
    const width = isMark
      ? BRAND_LOGO.elevate3dMarkWidth
      : isStacked
        ? BRAND_LOGO.elevate3dStackedWidth
        : BRAND_LOGO.elevate3dHorizontalWidth;
    const height = isMark
      ? BRAND_LOGO.elevate3dMarkHeight
      : isStacked
        ? BRAND_LOGO.elevate3dStackedHeight
        : BRAND_LOGO.elevate3dHorizontalHeight;

    return (
      <Image
        src={src}
        alt="Elevate"
        width={width}
        height={height}
        priority={priority}
        quality={quality}
        className={cn('w-auto max-w-full object-contain', heightClassName, className)}
      />
    );
  }

  const isMark = variant === 'mark';
  const src = isMark
    ? on === 'dark'
      ? BRAND_LOGO.markOnDark
      : BRAND_LOGO.markOnLight
    : on === 'dark'
      ? BRAND_LOGO.onDark
      : BRAND_LOGO.onLight;
  const width = isMark ? 180 : BRAND_LOGO.width;
  const height = isMark ? 180 : BRAND_LOGO.height;

  return (
    <Image
      src={src}
      alt="Elevate Apparel"
      width={width}
      height={height}
      priority={priority}
      quality={quality}
      className={cn('w-auto max-w-full object-contain', heightClassName, className)}
    />
  );
}

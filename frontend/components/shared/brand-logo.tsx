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
  width: 1248,
  height: 179,
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
  className,
  heightClassName = 'h-7',
  priority = false,
  quality = 90,
}: BrandLogoProps) {
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

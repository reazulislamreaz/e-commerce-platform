'use client';

import Link from 'next/link';
import { Heart, Menu, Search } from 'lucide-react';
import { BrandLogo } from '@/components/shared/brand-logo';
import { cn } from '@/lib/utils';

type MobileHeaderBarProps = {
  menuOpen: boolean;
  onMenuToggle: () => void;
  onSearchOpen: () => void;
  wishlistCount: number;
  /** Home page light chrome only. */
  theme?: 'dark' | 'light';
};

export function MobileHeaderBar({
  menuOpen,
  onMenuToggle,
  onSearchOpen,
  wishlistCount,
}: MobileHeaderBarProps) {
  const iconButtonClass = cn(
    'flex size-11 shrink-0 items-center justify-center rounded-[4px] text-[#111111] transition-colors hover:text-[#C9A227] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAFA]',
  );

  return (
    <div className="relative mx-auto flex h-[52px] max-w-[1400px] items-center px-2 sm:px-4 md:hidden">
      <button
        type="button"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        onClick={onMenuToggle}
        className={cn(iconButtonClass, 'z-10')}
      >
        <Menu className="size-5" strokeWidth={1.7} />
      </button>

      <Link
        href="/"
        aria-label="Elevate Apparel home"
        className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5"
      >
        <BrandLogo
          style="elevate3d"
          layout="horizontal"
          priority
          heightClassName="h-8 sm:h-9"
          className="max-w-[min(100%,168px)] sm:max-w-[188px]"
        />
        <span className="shrink-0 pt-0.5 text-[10px] font-medium leading-none tracking-[-0.01em] text-[#111111] sm:text-[11px]">
          Apparel
        </span>
      </Link>

      <div className="z-10 ml-auto flex shrink-0 items-center">
        <button
          type="button"
          aria-label="Search"
          onClick={onSearchOpen}
          className={iconButtonClass}
        >
          <Search className="size-5" strokeWidth={1.7} />
        </button>
        <Link href="/wishlist" aria-label="Wishlist" className={cn('relative', iconButtonClass)}>
          <Heart className="size-5" strokeWidth={1.7} />
          {wishlistCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-[#C9A227] text-[9px] font-bold text-white">
              {wishlistCount > 9 ? '9+' : wishlistCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}

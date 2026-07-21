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
  theme = 'dark',
}: MobileHeaderBarProps) {
  const isLight = theme === 'light';
  const iconButtonClass = cn(
    'flex size-11 shrink-0 items-center justify-center rounded-[4px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2',
    isLight
      ? 'text-[#111111] hover:text-[#C9A227] focus-visible:ring-[#C9A227] focus-visible:ring-offset-[#FAFAFA]'
      : 'text-[#111111] hover:text-[#C9A227] focus-visible:ring-[#C9A227] focus-visible:ring-offset-[#FAFAFA]',
  );

  return (
    <div className="relative mx-auto flex h-[52px] max-w-[1400px] items-center px-2 sm:px-4 md:hidden">
      <button
        type="button"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        onClick={onMenuToggle}
        className={iconButtonClass}
      >
        <Menu className="size-5" strokeWidth={1.7} />
      </button>

      <Link
        href="/"
        aria-label="Elevate Apparel home"
        className="absolute left-1/2 top-1/2 max-w-[140px] -translate-x-1/2 -translate-y-1/2 sm:max-w-[160px]"
      >
        <BrandLogo on="light" priority heightClassName="h-7" />
      </Link>

      <div className="ml-auto flex shrink-0 items-center">
        <button
          type="button"
          aria-label="Search"
          onClick={onSearchOpen}
          className={iconButtonClass}
        >
          <Search className="size-5" strokeWidth={1.7} />
        </button>
        <Link href="/wishlist" aria-label="Wishlist" className={`relative ${iconButtonClass}`}>
          <Heart className="size-5" strokeWidth={1.7} />
          {wishlistCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-[#C9A227] text-[9px] font-bold text-black">
              {wishlistCount > 9 ? '9+' : wishlistCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}

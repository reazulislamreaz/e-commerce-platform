'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, Menu, Search } from 'lucide-react';

const iconButtonClass =
  'flex size-11 shrink-0 items-center justify-center rounded-[4px] text-white transition-colors hover:text-[#e3bb78] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e3bb78] focus-visible:ring-offset-2 focus-visible:ring-offset-black';

type MobileHeaderBarProps = {
  menuOpen: boolean;
  onMenuToggle: () => void;
  onSearchOpen: () => void;
  wishlistCount: number;
};

export function MobileHeaderBar({
  menuOpen,
  onMenuToggle,
  onSearchOpen,
  wishlistCount,
}: MobileHeaderBarProps) {
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
        <Image
          src="/images/brand/elevate-apparel-logo.webp"
          alt="Elevate Apparel"
          width={1248}
          height={179}
          priority
          className="h-7 w-auto max-w-full object-contain"
        />
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
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-[#e5bd78] text-[9px] font-bold text-black">
              {wishlistCount > 9 ? '9+' : wishlistCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}

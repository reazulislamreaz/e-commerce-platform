'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Heart,
  LogOut,
  MapPin,
  Menu,
  Package,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser, selectCartCount, selectWishlistCount } from '@/store/selectors';
import { useLogout } from '@/features/auth/hooks';
import { displayName } from '@/features/account';
import { isActiveNav, MAIN_NAV } from '@/components/layouts/site-nav';
import { PrefetchNavLink } from '@/components/layouts/prefetch-nav-link';
import { MobileHeaderBar } from '@/components/layouts/mobile-header-bar';
import { MobileNavDrawer } from '@/components/layouts/mobile-nav-drawer';
import { BrandLogo } from '@/components/shared/brand-logo';
import { cn } from '@/lib/utils';

const SearchDialog = dynamic(
  () => import('@/components/shared/search-dialog').then((mod) => mod.SearchDialog),
  {
    ssr: false,
    loading: () => (
      <div
        className="fixed inset-0 z-70 flex items-start justify-center bg-[#111111]/40 pt-[12vh] backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-label="Loading search"
      >
        <div className="w-full max-w-xl rounded-[4px] border border-[#E5E7EB] bg-white p-5 shadow-2xl">
          <div className="h-11 animate-pulse rounded-[4px] bg-[#E5E7EB]" />
          <div className="mt-4 space-y-2">
            <div className="h-10 animate-pulse rounded-[4px] bg-[#E5E7EB]" />
            <div className="h-10 animate-pulse rounded-[4px] bg-[#E5E7EB]" />
            <div className="h-10 animate-pulse rounded-[4px] bg-[#E5E7EB]" />
          </div>
        </div>
      </div>
    ),
  },
);

const iconClass =
  'p-1 text-[#111111] transition-colors hover:text-[#C9A227] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]';

const menuItemClass =
  'block px-3 py-2 text-[12px] text-[#111111] transition-colors hover:bg-[#FAFAFA] hover:text-[#C9A227]';

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tabletMenuOpen, setTabletMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const pathname = usePathname();
  const storeActive = isActiveNav(pathname, '/store');
  const cartCount = useAppSelector(selectCartCount);
  const wishlistCount = useAppSelector(selectWishlistCount);
  const user = useAppSelector(selectAuthUser);
  const logout = useLogout();

  const accountDropdown = accountOpen && (
    <>
      <button
        type="button"
        aria-label="Close account menu"
        className="fixed inset-0 z-40"
        onClick={() => setAccountOpen(false)}
      />
      <div className="absolute right-0 z-50 mt-2 w-52 rounded-[4px] border border-[#E5E7EB] bg-white py-2 text-[#111111] shadow-xl">
        {user ? (
          <>
            <p className="truncate px-3 pb-2 text-[11px] text-[#555555]">{displayName(user)}</p>
            <Link
              href="/account"
              onClick={() => setAccountOpen(false)}
              className={cn(menuItemClass, 'flex items-center gap-2')}
            >
              <UserRound className="size-3.5" /> My Account
            </Link>
            <Link
              href="/account/orders"
              onClick={() => setAccountOpen(false)}
              className={cn(menuItemClass, 'flex items-center gap-2')}
            >
              <Package className="size-3.5" /> Orders
            </Link>
            <button
              type="button"
              onClick={() => {
                setAccountOpen(false);
                logout.mutate();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#111111] transition-colors hover:bg-[#FAFAFA] hover:text-red-600"
            >
              <LogOut className="size-3.5" /> Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" onClick={() => setAccountOpen(false)} className={menuItemClass}>
              Login
            </Link>
            <Link href="/register" onClick={() => setAccountOpen(false)} className={menuItemClass}>
              Register
            </Link>
            <Link
              href="/track-order"
              onClick={() => setAccountOpen(false)}
              className={menuItemClass}
            >
              Track Order
            </Link>
          </>
        )}
      </div>
    </>
  );

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAFA] text-[#111111] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      {/* Desktop header */}
      <div className="mx-auto hidden h-[56px] max-w-[1400px] items-center border-b border-[#E5E7EB] px-4 sm:px-7 lg:flex">
        <Link href="/" className="shrink-0" aria-label="Elevate Apparel home">
          <BrandLogo on="light" priority heightClassName="h-7 sm:h-[37px]" />
        </Link>
        <nav aria-label="Main navigation" className="mx-auto flex items-center gap-[27px]">
          {MAIN_NAV.map(([name, href]) => {
            const active = isActiveNav(pathname, href);
            return (
              <PrefetchNavLink
                key={href}
                href={href}
                className={cn(
                  'relative py-[20px] text-[11px] font-semibold tracking-[-.01em] transition-colors',
                  active
                    ? 'text-[#111111] after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-[#C9A227]'
                    : 'text-[#111111] hover:text-[#C9A227]',
                )}
              >
                {name}
              </PrefetchNavLink>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 pl-3 sm:gap-5 sm:pl-5">
          <button
            type="button"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
            className={iconClass}
          >
            <Search className="size-5" strokeWidth={1.7} />
          </button>
          <Link
            href="/store"
            aria-label="Store — Wari, Dhaka"
            title="Store"
            className={cn(iconClass, storeActive && 'text-[#C9A227]')}
          >
            <MapPin className="size-5" strokeWidth={1.7} />
          </Link>
          <Link href="/wishlist" aria-label="Wishlist" className={cn('relative', iconClass)}>
            <Heart className="size-5" strokeWidth={1.7} />
            {wishlistCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#C9A227] text-[9px] font-bold text-[#111111]">
                {wishlistCount > 9 ? '9+' : wishlistCount}
              </span>
            )}
          </Link>
          <div className="relative">
            <button
              type="button"
              aria-label="Account"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((v) => !v)}
              className={iconClass}
            >
              <UserRound className="size-5" strokeWidth={1.7} />
            </button>
            {accountDropdown}
          </div>
          <Link href="/cart" aria-label="Shopping bag" className={cn('relative', iconClass)}>
            <ShoppingBag className="size-5" strokeWidth={1.7} />
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#C9A227] text-[9px] font-bold text-[#111111]">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          </Link>
        </div>
      </div>

      {/* Tablet header */}
      <div className="mx-auto hidden h-[56px] max-w-[1400px] items-center border-b border-[#E5E7EB] px-4 sm:px-7 md:flex lg:hidden">
        <Link href="/" className="shrink-0" aria-label="Elevate Apparel home">
          <BrandLogo on="light" priority heightClassName="h-7 sm:h-[37px]" />
        </Link>
        <div className="ml-auto flex items-center gap-3 pl-3 sm:gap-5 sm:pl-5">
          <button
            type="button"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
            className={iconClass}
          >
            <Search className="size-5" strokeWidth={1.7} />
          </button>
          <Link
            href="/store"
            aria-label="Store — Wari, Dhaka"
            title="Store"
            className={cn(iconClass, storeActive && 'text-[#C9A227]')}
          >
            <MapPin className="size-5" strokeWidth={1.7} />
          </Link>
          <Link href="/wishlist" aria-label="Wishlist" className={cn('relative', iconClass)}>
            <Heart className="size-5" strokeWidth={1.7} />
            {wishlistCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#C9A227] text-[9px] font-bold text-[#111111]">
                {wishlistCount > 9 ? '9+' : wishlistCount}
              </span>
            )}
          </Link>
          <div className="relative">
            <button
              type="button"
              aria-label="Account"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((v) => !v)}
              className={iconClass}
            >
              <UserRound className="size-5" strokeWidth={1.7} />
            </button>
            {accountDropdown}
          </div>
          <Link href="/cart" aria-label="Shopping bag" className={cn('relative', iconClass)}>
            <ShoppingBag className="size-5" strokeWidth={1.7} />
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#C9A227] text-[9px] font-bold text-[#111111]">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          </Link>
          <button
            type="button"
            aria-label={tabletMenuOpen ? 'Close menu' : 'Open menu'}
            className={iconClass}
            onClick={() => setTabletMenuOpen(!tabletMenuOpen)}
          >
            {tabletMenuOpen ? (
              <X className="size-5" strokeWidth={1.7} />
            ) : (
              <Menu className="size-5" strokeWidth={1.7} />
            )}
          </button>
        </div>
      </div>
      {tabletMenuOpen && (
        <nav className="hidden border-b border-[#E5E7EB] bg-[#FAFAFA] px-5 py-3 md:block lg:hidden">
          {MAIN_NAV.map(([name, href]) => (
            <PrefetchNavLink
              key={href}
              href={href}
              onClick={() => setTabletMenuOpen(false)}
              className={cn(
                'block border-b border-[#E5E7EB] py-2.5 text-xs font-semibold tracking-wide transition-colors',
                isActiveNav(pathname, href)
                  ? 'text-[#C9A227]'
                  : 'text-[#111111] hover:text-[#C9A227]',
              )}
            >
              {name}
            </PrefetchNavLink>
          ))}
          <Link
            href="/store"
            onClick={() => setTabletMenuOpen(false)}
            className={cn(
              'flex items-center gap-2 border-b border-[#E5E7EB] py-2.5 text-xs font-semibold tracking-wide',
              storeActive ? 'text-[#C9A227]' : 'text-[#111111] hover:text-[#C9A227]',
            )}
          >
            <MapPin className="size-3.5" strokeWidth={1.7} />
            STORE — WARI, DHAKA
          </Link>
          <Link
            href="/wishlist"
            onClick={() => setTabletMenuOpen(false)}
            className="block border-b border-[#E5E7EB] py-2.5 text-xs font-semibold tracking-wide text-[#111111] hover:text-[#C9A227]"
          >
            WISHLIST
          </Link>
          <Link
            href={user ? '/account' : '/login'}
            onClick={() => setTabletMenuOpen(false)}
            className="block py-2.5 text-xs font-semibold tracking-wide text-[#111111] hover:text-[#C9A227]"
          >
            {user ? 'MY ACCOUNT' : 'LOGIN'}
          </Link>
        </nav>
      )}

      {/* Mobile header */}
      <div className="border-b border-[#E5E7EB] md:hidden">
        <MobileHeaderBar
          menuOpen={menuOpen}
          onMenuToggle={() => setMenuOpen((value) => !value)}
          onSearchOpen={() => setSearchOpen(true)}
          wishlistCount={wishlistCount}
          theme="light"
        />
      </div>

      <MobileNavDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        pathname={pathname}
        storeActive={storeActive}
        user={user}
        onLogout={() => logout.mutate()}
        theme="light"
      />

      {searchOpen ? <SearchDialog open onClose={() => setSearchOpen(false)} /> : null}
    </header>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
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
import {
  selectAuthUser,
  selectCartCount,
  selectWishlistCount,
} from '@/store/selectors';
import { useLogout } from '@/features/auth/hooks';
import { displayName } from '@/features/account/storage';

const SearchDialog = dynamic(
  () =>
    import('@/components/shared/search-dialog').then((mod) => mod.SearchDialog),
  { ssr: false },
);

const nav = [
  ['HOME', '/'],
  ['SHOP', '/shop'],
  ['MEN', '/category/men'],
  ['WOMEN', '/category/women'],
  ['NEW ARRIVALS', '/new-arrivals'],
  ['SALE', '/sale'],
  ['ABOUT US', '/about'],
  ['CONTACT US', '/contact'],
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const pathname = usePathname();
  const storeActive = isActive(pathname, '/store');
  const cartCount = useAppSelector(selectCartCount);
  const wishlistCount = useAppSelector(selectWishlistCount);
  const user = useAppSelector(selectAuthUser);
  const logout = useLogout();

  return (
    <header className="z-40 bg-black text-white">
      <div className="flex min-h-[28px] items-center justify-center border-b border-[#282828] px-3 py-1 text-center text-[10px] font-semibold leading-4 text-[#f1eee9]">
        FREE DELIVERY ON ALL ORDERS OVER ৳1999{' '}
        <span className="ml-1 text-[#e3bb77]">♣</span>
      </div>
      <div className="mx-auto flex h-[56px] max-w-[1400px] items-center border-b border-[#292929] px-4 sm:px-7">
        <Link href="/" className="shrink-0" aria-label="Elevate Apparel home">
          <Image
            src="/images/brand/elevate-apparel-logo.webp"
            alt="Elevate Apparel"
            width={1248}
            height={179}
            priority
            className="h-7 w-auto object-contain sm:h-[37px]"
          />
        </Link>
        <nav aria-label="Main navigation" className="mx-auto hidden items-center gap-[27px] lg:flex">
          {nav.map(([name, href]) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative py-[20px] text-[11px] font-semibold tracking-[-.01em] transition-colors ${
                  active ? 'text-white' : 'text-white/90 hover:text-[#e3bb78]'
                } ${active ? 'after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-[#e4bd7c]' : ''}`}
              >
                {name}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 pl-3 sm:gap-5 sm:pl-5 lg:ml-0">
          <button
            type="button"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
            className="p-1 transition-colors hover:text-[#e3bb78]"
          >
            <Search className="size-5" strokeWidth={1.7} />
          </button>
          <Link
            href="/store"
            aria-label="Store — Wari, Dhaka"
            title="Store"
            className={`p-1 transition-colors hover:text-[#e3bb78] ${storeActive ? 'text-[#e3bb78]' : ''}`}
          >
            <MapPin className="size-5" strokeWidth={1.7} />
          </Link>
          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="relative p-1 transition-colors hover:text-[#e3bb78]"
          >
            <Heart className="size-5" strokeWidth={1.7} />
            {wishlistCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#e5bd78] text-[9px] font-bold text-black">
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
              className="p-1 transition-colors hover:text-[#e3bb78]"
            >
              <UserRound className="size-5" strokeWidth={1.7} />
            </button>
            {accountOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close account menu"
                  className="fixed inset-0 z-40"
                  onClick={() => setAccountOpen(false)}
                />
                <div className="absolute right-0 z-50 mt-2 w-52 rounded-[4px] border border-[#2d2a27] bg-[#111110] py-2 shadow-xl">
                  {user ? (
                    <>
                      <p className="truncate px-3 pb-2 text-[11px] text-[#b5b0a8]">
                        {displayName(user)}
                      </p>
                      <Link
                        href="/account"
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-[#1a1815] hover:text-[#e3bb78]"
                      >
                        <UserRound className="size-3.5" /> My Account
                      </Link>
                      <Link
                        href="/account/orders"
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-[#1a1815] hover:text-[#e3bb78]"
                      >
                        <Package className="size-3.5" /> Orders
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setAccountOpen(false);
                          logout.mutate();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-[#1a1815] hover:text-red-300"
                      >
                        <LogOut className="size-3.5" /> Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setAccountOpen(false)}
                        className="block px-3 py-2 text-[12px] hover:bg-[#1a1815] hover:text-[#e3bb78]"
                      >
                        Login
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setAccountOpen(false)}
                        className="block px-3 py-2 text-[12px] hover:bg-[#1a1815] hover:text-[#e3bb78]"
                      >
                        Register
                      </Link>
                      <Link
                        href="/track-order"
                        onClick={() => setAccountOpen(false)}
                        className="block px-3 py-2 text-[12px] hover:bg-[#1a1815] hover:text-[#e3bb78]"
                      >
                        Track Order
                      </Link>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          <Link
            href="/cart"
            aria-label="Shopping bag"
            className="relative p-1 transition-colors hover:text-[#e3bb78]"
          >
            <ShoppingBag className="size-5" strokeWidth={1.7} />
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#e5bd78] text-[9px] font-bold text-black">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          </Link>
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="p-1 lg:hidden"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-b border-[#292929] px-5 py-3 lg:hidden">
          {nav.map(([name, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`block border-b border-white/5 py-2.5 text-xs font-semibold tracking-wide ${
                isActive(pathname, href) ? 'text-[#e3bb78]' : ''
              }`}
            >
              {name}
            </Link>
          ))}
          <Link
            href="/store"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 border-b border-white/5 py-2.5 text-xs font-semibold tracking-wide ${
              storeActive ? 'text-[#e3bb78]' : ''
            }`}
          >
            <MapPin className="size-3.5" strokeWidth={1.7} />
            STORE — WARI, DHAKA
          </Link>
          <Link
            href="/wishlist"
            onClick={() => setOpen(false)}
            className="block border-b border-white/5 py-2.5 text-xs font-semibold tracking-wide"
          >
            WISHLIST
          </Link>
          <Link
            href={user ? '/account' : '/login'}
            onClick={() => setOpen(false)}
            className="block py-2.5 text-xs font-semibold tracking-wide"
          >
            {user ? 'MY ACCOUNT' : 'LOGIN'}
          </Link>
        </nav>
      )}
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}

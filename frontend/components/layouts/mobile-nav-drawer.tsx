'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { LogOut, MapPin, Package, UserRound, X } from 'lucide-react';
import type { AuthUser } from '@/types/auth';
import { displayName } from '@/features/account';
import { isActiveNav, MAIN_NAV } from './site-nav';
import { PrefetchNavLink } from './prefetch-nav-link';
import { cn } from '@/lib/utils';

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  pathname: string;
  storeActive: boolean;
  user: AuthUser | null;
  onLogout: () => void;
  /** Home page light chrome only. */
  theme?: 'dark' | 'light';
};

export function MobileNavDrawer({
  open,
  onClose,
  pathname,
  storeActive,
  user,
  onLogout,
  theme = 'light',
}: MobileNavDrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isLight = theme === 'light';

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 md:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close navigation menu"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={`absolute inset-0 bg-[#111111]/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          'absolute inset-y-0 left-0 flex w-[min(100%,320px)] flex-col shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
          isLight
            ? 'border-r border-[#E5E7EB] bg-[#FAFAFA]'
            : 'border-r border-[#E5E7EB] bg-[#FAFAFA]',
        )}
      >
        <div
          className={cn(
            'flex items-center justify-between px-4 py-3',
            isLight ? 'border-b border-[#E5E7EB]' : 'border-b border-[#E5E7EB]',
          )}
        >
          <p
            className={cn(
              'text-[11px] font-bold uppercase tracking-[.14em]',
              isLight ? 'text-black' : 'text-[#C9A227]',
            )}
          >
            Menu
          </p>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className={cn(
              'flex size-11 items-center justify-center rounded-[4px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]',
              isLight ? 'text-black hover:text-[#C9A227]' : 'text-[#111111] hover:text-[#C9A227]',
            )}
          >
            <X className="size-5" strokeWidth={1.7} />
          </button>
        </div>

        <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto px-4 py-3">
          {MAIN_NAV.map(([name, href]) => (
            <PrefetchNavLink
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'block py-3 text-xs font-semibold uppercase tracking-wide transition-colors',
                isLight ? 'border-b border-[#E5E7EB]' : 'border-b border-[#E5E7EB]/80',
                isActiveNav(pathname, href)
                  ? 'text-[#C9A227]'
                  : isLight
                    ? 'text-black hover:text-[#C9A227]'
                    : 'text-[#111111] hover:text-[#C9A227]',
              )}
            >
              {name}
            </PrefetchNavLink>
          ))}
          <Link
            href="/store"
            onClick={onClose}
            className={cn(
              'flex items-center gap-2 py-3 text-xs font-semibold uppercase tracking-wide',
              isLight ? 'border-b border-[#E5E7EB]' : 'border-b border-[#E5E7EB]/80',
              storeActive
                ? 'text-[#C9A227]'
                : isLight
                  ? 'text-black hover:text-[#C9A227]'
                  : 'text-[#111111] hover:text-[#C9A227]',
            )}
          >
            <MapPin className="size-3.5" strokeWidth={1.7} />
            Store — Wari, Dhaka
          </Link>
          <Link
            href="/wishlist"
            onClick={onClose}
            className={cn(
              'block py-3 text-xs font-semibold uppercase tracking-wide transition-colors',
              isLight ? 'border-b border-[#E5E7EB]' : 'border-b border-[#E5E7EB]/80',
              isLight ? 'text-black hover:text-[#C9A227]' : 'text-[#111111] hover:text-[#C9A227]',
            )}
          >
            Wishlist
          </Link>
          <Link
            href="/track-order"
            onClick={onClose}
            className={cn(
              'block py-3 text-xs font-semibold uppercase tracking-wide transition-colors',
              isLight ? 'border-b border-[#E5E7EB]' : 'border-b border-[#E5E7EB]/80',
              isLight ? 'text-black hover:text-[#C9A227]' : 'text-[#111111] hover:text-[#C9A227]',
            )}
          >
            Track Order
          </Link>
        </nav>

        <div
          className={cn(
            'px-4 py-4',
            isLight ? 'border-t border-[#E5E7EB]' : 'border-t border-[#E5E7EB]',
          )}
        >
          {user ? (
            <div className="space-y-1">
              <p
                className={cn(
                  'truncate pb-2 text-[11px]',
                  isLight ? 'text-[#555555]' : 'text-[#555555]',
                )}
              >
                {displayName(user)}
              </p>
              <Link
                href="/account"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2 rounded-[4px] px-2 py-2.5 text-[12px] transition-colors',
                  isLight
                    ? 'text-black hover:bg-white hover:text-[#C9A227]'
                    : 'text-[#111111] hover:bg-white hover:text-[#C9A227]',
                )}
              >
                <UserRound className="size-3.5" /> My Account
              </Link>
              <Link
                href="/account/orders"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2 rounded-[4px] px-2 py-2.5 text-[12px] transition-colors',
                  isLight
                    ? 'text-black hover:bg-white hover:text-[#C9A227]'
                    : 'text-[#111111] hover:bg-white hover:text-[#C9A227]',
                )}
              >
                <Package className="size-3.5" /> Orders
              </Link>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-[4px] px-2 py-2.5 text-left text-[12px] transition-colors',
                  isLight
                    ? 'text-black hover:bg-white hover:text-red-600'
                    : 'text-[#111111] hover:bg-white hover:text-red-700',
                )}
              >
                <LogOut className="size-3.5" /> Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <Link
                href="/login"
                onClick={onClose}
                className={cn(
                  'rounded-[4px] px-3 py-2.5 text-center text-[11px] font-bold uppercase transition-colors',
                  isLight
                    ? 'border border-[#111111] bg-[#111111] text-[#111111] hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-black'
                    : 'border border-[#111111] bg-[#111111] text-white hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]',
                )}
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={onClose}
                className={cn(
                  'rounded-[4px] px-3 py-2.5 text-center text-[11px] font-bold uppercase transition-colors',
                  isLight
                    ? 'border border-black bg-white text-black hover:bg-[#FAFAFA] hover:text-[#111111]'
                    : 'border border-[#E5E7EB] text-[#111111] hover:border-[#C9A227]',
                )}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

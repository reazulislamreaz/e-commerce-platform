'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { LogOut, MapPin, Package, UserRound, X } from 'lucide-react';
import type { AuthUser } from '@/types/auth';
import { displayName } from '@/features/account';
import { isActiveNav, MAIN_NAV } from './site-nav';

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  pathname: string;
  storeActive: boolean;
  user: AuthUser | null;
  onLogout: () => void;
};

export function MobileNavDrawer({
  open,
  onClose,
  pathname,
  storeActive,
  user,
  onLogout,
}: MobileNavDrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

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
        className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`absolute inset-y-0 left-0 flex w-[min(100%,320px)] flex-col border-r border-[#2d2a27] bg-[#0a0a0b] shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#2d2a27] px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#e0bd7d]">Menu</p>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-[4px] text-white transition-colors hover:text-[#e3bb78] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e3bb78]"
          >
            <X className="size-5" strokeWidth={1.7} />
          </button>
        </div>

        <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto px-4 py-3">
          {MAIN_NAV.map(([name, href]) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`block border-b border-[#2d2a27]/80 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                isActiveNav(pathname, href) ? 'text-[#e3bb78]' : 'text-white hover:text-[#e3bb78]'
              }`}
            >
              {name}
            </Link>
          ))}
          <Link
            href="/store"
            onClick={onClose}
            className={`flex items-center gap-2 border-b border-[#2d2a27]/80 py-3 text-xs font-semibold uppercase tracking-wide ${
              storeActive ? 'text-[#e3bb78]' : 'text-white hover:text-[#e3bb78]'
            }`}
          >
            <MapPin className="size-3.5" strokeWidth={1.7} />
            Store — Wari, Dhaka
          </Link>
          <Link
            href="/wishlist"
            onClick={onClose}
            className="block border-b border-[#2d2a27]/80 py-3 text-xs font-semibold uppercase tracking-wide text-white hover:text-[#e3bb78]"
          >
            Wishlist
          </Link>
          <Link
            href="/track-order"
            onClick={onClose}
            className="block border-b border-[#2d2a27]/80 py-3 text-xs font-semibold uppercase tracking-wide text-white hover:text-[#e3bb78]"
          >
            Track Order
          </Link>
        </nav>

        <div className="border-t border-[#2d2a27] px-4 py-4">
          {user ? (
            <div className="space-y-1">
              <p className="truncate pb-2 text-[11px] text-[#b5b0a8]">{displayName(user)}</p>
              <Link
                href="/account"
                onClick={onClose}
                className="flex items-center gap-2 rounded-[4px] px-2 py-2.5 text-[12px] text-white hover:bg-[#1a1815] hover:text-[#e3bb78]"
              >
                <UserRound className="size-3.5" /> My Account
              </Link>
              <Link
                href="/account/orders"
                onClick={onClose}
                className="flex items-center gap-2 rounded-[4px] px-2 py-2.5 text-[12px] text-white hover:bg-[#1a1815] hover:text-[#e3bb78]"
              >
                <Package className="size-3.5" /> Orders
              </Link>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="flex w-full items-center gap-2 rounded-[4px] px-2 py-2.5 text-left text-[12px] text-white hover:bg-[#1a1815] hover:text-red-300"
              >
                <LogOut className="size-3.5" /> Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <Link
                href="/login"
                onClick={onClose}
                className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-3 py-2.5 text-center text-[11px] font-bold uppercase text-[#18120b]"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={onClose}
                className="rounded-[4px] border border-[#37332c] px-3 py-2.5 text-center text-[11px] font-bold uppercase text-white hover:border-[#e3bb78]"
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

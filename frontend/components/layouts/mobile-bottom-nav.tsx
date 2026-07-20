'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Home, LayoutGrid, ShoppingBag, type LucideIcon } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectCartCount, selectWishlistCount } from '@/store/selectors';
import { isActiveNav } from './site-nav';

interface BottomNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: 'cart' | 'wishlist';
}

const items: readonly BottomNavItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Shop', href: '/shop', icon: LayoutGrid },
  { label: 'Cart', href: '/cart', icon: ShoppingBag, badge: 'cart' },
  { label: 'Wishlist', href: '/wishlist', icon: Heart, badge: 'wishlist' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const cartCount = useAppSelector(selectCartCount);
  const wishlistCount = useAppSelector(selectWishlistCount);

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#292929] bg-black/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-[1400px] items-stretch justify-around">
        {items.map(({ label, href, icon: Icon, badge }) => {
          const active = isActiveNav(pathname, href);
          const count =
            badge === 'cart' ? cartCount : badge === 'wishlist' ? wishlistCount : 0;

          return (
            <li key={label} className="flex-1">
              <Link
                href={href}
                className={`relative flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-semibold uppercase tracking-[.06em] transition-colors ${
                  active ? 'text-[#e3bb78]' : 'text-[#b5b0a8] hover:text-white'
                }`}
              >
                <span className="relative">
                  <Icon className="size-5" strokeWidth={1.7} aria-hidden="true" />
                  {badge && count > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full bg-[#e5bd78] text-[9px] font-bold text-black">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

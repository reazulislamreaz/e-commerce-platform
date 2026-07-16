'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type PropsWithChildren } from 'react';
import {
  Bell,
  CreditCard,
  Heart,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  RefreshCw,
  Settings,
  Star,
  UserRound,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { useLogout } from '@/features/auth/hooks';
import { displayName } from '@/features/account';
import { cn } from '@/lib/utils';

const nav: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}[] = [
  { href: '/account', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/account/profile', label: 'My Profile', icon: UserRound },
  { href: '/account/password', label: 'Change Password', icon: KeyRound },
  { href: '/account/addresses', label: 'Address Book', icon: MapPin },
  { href: '/account/orders', label: 'Orders', icon: Package },
  { href: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/account/notifications', label: 'Notifications', icon: Bell },
  { href: '/account/coupons', label: 'Coupons', icon: CreditCard },
  { href: '/account/reviews', label: 'Reviews', icon: Star },
  { href: '/account/returns', label: 'Returns', icon: RotateCcw },
  { href: '/account/exchanges', label: 'Exchanges', icon: RefreshCw },
  { href: '/account/support', label: 'Support', icon: HelpCircle },
  { href: '/account/settings', label: 'Settings', icon: Settings },
];

export function AccountShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const hydrated = useAppSelector((s) => s.auth.hydrated);
  const logout = useLogout();

  useEffect(() => {
    if (hydrated && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, user, router, pathname]);

  if (!hydrated || !user) {
    return (
      <main className="flex flex-1 items-center justify-center bg-black py-20">
        <p className="text-sm text-[#b5b0a8]">Loading account…</p>
      </main>
    );
  }

  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
            My Account
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-.03em] text-white sm:text-3xl">
            {displayName(user)}
          </h1>
          <p className="mt-1 text-sm text-[#b5b0a8]">{user.email}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[4px] border border-[#2d2a27] bg-[#111110] p-2">
            <nav aria-label="Account" className="space-y-0.5">
              {nav.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-[4px] px-3 py-2.5 text-[12px] font-semibold transition-colors',
                      active
                        ? 'bg-[#1a1815] text-[#e3bb78]'
                        : 'text-[#e9e5de] hover:bg-[#1a1815] hover:text-[#e3bb78]',
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" strokeWidth={1.6} />
                    {item.label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}
                className="flex w-full items-center gap-2.5 rounded-[4px] px-3 py-2.5 text-left text-[12px] font-semibold text-[#e9e5de] transition-colors hover:bg-[#1a1815] hover:text-red-300"
              >
                <LogOut className="size-3.5 shrink-0" strokeWidth={1.6} />
                Logout
              </button>
            </nav>
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </section>
    </main>
  );
}

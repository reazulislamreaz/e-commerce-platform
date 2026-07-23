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
import { displayName, useUnreadNotificationCount } from '@/features/account';
import { AccountPanelSkeleton } from '@/components/common/skeleton';
import { loginHref } from '@/lib/auth-redirect';
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
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
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
  const unreadQuery = useUnreadNotificationCount(user?.id);
  const unreadCount = unreadQuery.data ?? 0;

  useEffect(() => {
    if (hydrated && !user) {
      router.replace(loginHref(pathname, 'account'));
    }
  }, [hydrated, user, router, pathname]);

  const ready = hydrated && Boolean(user);

  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]">
      <section className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
            My Account
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-.03em] text-[#111111] sm:text-3xl">
            {ready && user ? displayName(user) : 'Your account'}
          </h1>
          <p className="mt-1 text-sm text-[#555555]">
            {ready && user ? user.email : 'Loading your profile…'}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[4px] border border-[#E5E7EB] bg-white p-2">
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
                        ? 'bg-[#FAFAFA] text-[#C9A227]'
                        : 'text-[#555555] hover:bg-[#FAFAFA] hover:text-[#C9A227]',
                      !ready && 'pointer-events-none opacity-60',
                    )}
                    tabIndex={ready ? undefined : -1}
                  >
                    <Icon className="size-3.5 shrink-0" strokeWidth={1.6} />
                    <span className="flex-1">{item.label}</span>
                    {item.href === '/account/notifications' && unreadCount > 0 ? (
                      <span className="rounded-[4px] bg-[#C9A227] px-1.5 py-0.5 text-[9px] font-bold text-[#111111]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
              <button
                type="button"
                disabled={!ready}
                onClick={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}
                className="flex w-full items-center gap-2.5 rounded-[4px] px-3 py-2.5 text-left text-[12px] font-semibold text-[#555555] transition-colors hover:bg-[#FAFAFA] hover:text-red-700 disabled:opacity-50"
              >
                <LogOut className="size-3.5 shrink-0" strokeWidth={1.6} />
                Logout
              </button>
            </nav>
          </aside>
          <div className="min-w-0">{ready ? children : <AccountPanelSkeleton />}</div>
        </div>
      </section>
    </main>
  );
}

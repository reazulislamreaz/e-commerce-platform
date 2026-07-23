'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useEffect, useState, type PropsWithChildren } from 'react';
import {
  ArrowUpRight,
  Bell,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Loader2,
  LogOut,
  Mail,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeft,
  RotateCcw,
  Star,
  Store,
  X,
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { useLogout } from '@/features/auth/hooks';
import { useAdminQueues } from '@/features/admin';
import { adminNavGroups } from '@/components/admin/admin-nav';
import { AdminQuickSearch } from '@/components/admin/admin-quick-search';
import { AdminTableSkeleton } from '@/components/common/skeleton';
import { BrandLogo } from '@/components/shared/brand-logo';
import { cn } from '@/lib/utils';
import type { AuthUser, Role } from '@/types/auth';

const segmentLabels: Record<string, string> = {
  orders: 'Orders',
  returns: 'Returns',
  reviews: 'Reviews',
  inventory: 'Inventory',
  coupons: 'Coupons',
  products: 'Products',
  catalog: 'Taxonomy',
  contact: 'Contact',
  newsletter: 'Newsletter',
  users: 'Users',
};

type QueueBadge = { count: number; more: boolean };

function isAdminRole(role: Role | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean).slice(1);
  const crumbs = [
    { href: '/admin', label: 'Admin' },
    ...segments.map((segment, index) => ({
      href: `/admin/${segments.slice(0, index + 1).join('/')}`,
      label: segmentLabels[segment] ?? 'Detail',
    })),
  ];

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.1em]">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <Fragment key={crumb.href}>
              {index > 0 ? (
                <ChevronRight aria-hidden className="size-3 shrink-0 text-[#555555]" />
              ) : null}
              <li className="min-w-0">
                {last ? (
                  <span aria-current="page" className="block truncate text-[#C9A227]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="block truncate text-[#555555] transition-colors hover:text-[#111111]"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

function NavBadge({ badge }: { badge: QueueBadge }) {
  return (
    <span
      className={cn(
        'ml-auto min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold leading-none',
        badge.count > 0 ? 'bg-[#C9A227] text-[#111111]' : 'bg-[#F4F4F5] text-[#555555]',
      )}
    >
      {badge.count}
      {badge.more ? '+' : ''}
    </span>
  );
}

function NavLinks({
  pathname,
  collapsed,
  badges,
  role,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  badges: Record<string, QueueBadge | undefined>;
  role: Role;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Admin" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {adminNavGroups.map((group) => {
        const items = group.items.filter(
          (item) => !item.roles || item.roles.includes(role as 'SUPER_ADMIN' | 'ADMIN'),
        );
        if (items.length === 0) return null;
        return (
          <div key={group.label}>
            {!collapsed ? (
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#555555]">
                {group.label}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                const badge = badges[item.href];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-semibold tracking-[.02em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]',
                      collapsed && 'justify-center px-0',
                      active
                        ? 'bg-[#C9A227]/10 text-[#C9A227]'
                        : 'text-[#555555] hover:bg-[#FAFAFA] hover:text-[#111111]',
                    )}
                  >
                    {active ? (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-[#C9A227]"
                      />
                    ) : null}
                    <Icon
                      className={cn(
                        'size-4 shrink-0 transition-colors',
                        active ? 'text-[#C9A227]' : 'text-[#555555] group-hover:text-[#C9A227]',
                      )}
                      strokeWidth={1.6}
                    />
                    {!collapsed ? (
                      <>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {badge ? <NavBadge badge={badge} /> : null}
                      </>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function ProTipCard() {
  return (
    <div className="mx-3 mb-2 rounded-xl border border-[#C9A227]/20 bg-gradient-to-b from-[#C9A227]/[0.08] to-transparent p-3.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-[#C9A227] text-[#111111]">
        <Lightbulb className="size-4" strokeWidth={1.7} />
      </span>
      <p className="mt-2.5 text-[12px] font-bold text-[#111111]">Pro Tip</p>
      <p className="mt-1 text-[11px] leading-relaxed text-[#555555]">
        Keep your store updated and monitor orders regularly.
      </p>
      <Link
        href="/admin"
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-[4px] border border-[#111111] bg-[#111111] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]"
      >
        View analytics
        <ArrowUpRight className="size-3.5" strokeWidth={2} />
      </Link>
    </div>
  );
}

function AdminNotifications({
  queues,
  open,
  onToggle,
  onClose,
}: {
  queues: Array<{
    label: string;
    hint: string;
    href: string;
    icon: typeof Package;
    badge: QueueBadge | undefined;
  }>;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const total = queues.reduce((sum, queue) => sum + (queue.badge?.count ?? 0), 0);
  const hasMore = queues.some((queue) => queue.badge?.more);

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Notifications, ${total}${hasMore ? ' or more' : ''} pending`}
        onClick={onToggle}
        className="relative rounded-lg border border-[#E5E7EB] p-2 text-[#555555] transition-colors hover:border-[#C9A227]/60 hover:text-[#111111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]"
      >
        <Bell className="size-4" strokeWidth={1.7} />
        {total > 0 ? (
          <span
            aria-hidden
            className="absolute -right-1.5 -top-1.5 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[9px] font-bold leading-none text-white"
          >
            {total > 9 ? '9+' : total}
            {hasMore && total <= 9 ? '+' : ''}
          </span>
        ) : null}
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-40 cursor-default"
            onClick={onClose}
          />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] shadow-[0_16px_48px_-12px_rgba(0,0,0,.15)]"
          >
            <div className="border-b border-[#E5E7EB] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#111111]">
                Needs attention
              </p>
            </div>
            <div className="p-1.5">
              {total === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-[#555555]">
                  All caught up — nothing pending.
                </p>
              ) : (
                queues
                  .filter((queue) => (queue.badge?.count ?? 0) > 0)
                  .map((queue) => {
                    const Icon = queue.icon;
                    return (
                      <Link
                        key={queue.href}
                        href={queue.href}
                        role="menuitem"
                        onClick={onClose}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#FAFAFA]"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] text-[#C9A227]">
                          <Icon className="size-3.5" strokeWidth={1.7} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[#111111]">
                            {queue.label}
                          </span>
                          <span className="block text-xs text-[#555555]">{queue.hint}</span>
                        </span>
                        <NavBadge badge={queue.badge!} />
                      </Link>
                    );
                  })
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function toBadge(query: {
  data?: { data: unknown[]; meta: { nextCursor: string | null } };
}): QueueBadge | undefined {
  if (!query.data) return undefined;
  return { count: query.data.data.length, more: Boolean(query.data.meta.nextCursor) };
}

function AdminChrome({ user, children }: PropsWithChildren<{ user: AuthUser }>) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { confirmedOrders, pendingReturns, pendingReviews, newContact } = useAdminQueues();

  useEffect(() => {
    if (!drawerOpen && !menuOpen && !notifOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        setMenuOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, menuOpen, notifOpen]);

  const badges: Record<string, QueueBadge | undefined> = {
    '/admin/orders': toBadge(confirmedOrders),
    '/admin/returns': toBadge(pendingReturns),
    '/admin/reviews': toBadge(pendingReviews),
    '/admin/contact': toBadge(newContact),
  };

  const notificationQueues = [
    {
      label: 'Confirmed orders',
      hint: 'Awaiting processing',
      href: '/admin/orders?status=CONFIRMED',
      icon: Package,
      badge: badges['/admin/orders'],
    },
    {
      label: 'Pending returns',
      hint: 'Needs a decision',
      href: '/admin/returns?status=PENDING',
      icon: RotateCcw,
      badge: badges['/admin/returns'],
    },
    {
      label: 'Pending reviews',
      hint: 'Moderation queue',
      href: '/admin/reviews?status=PENDING',
      icon: Star,
      badge: badges['/admin/reviews'],
    },
    {
      label: 'New messages',
      hint: 'Contact inbox',
      href: '/admin/contact?status=NEW',
      icon: Mail,
      badge: badges['/admin/contact'],
    },
  ];

  const initial = (user.firstName?.[0] ?? user.email[0] ?? 'A').toUpperCase();
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email.split('@')[0];
  const displayRole = user.role
    .toLowerCase()
    .split('_')
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');

  const brand = (
    <Link
      href="/admin"
      className={cn(
        'flex h-14 shrink-0 items-center gap-2.5 border-b border-[#E5E7EB] px-4 transition-colors hover:bg-[#FAFAFA]',
        collapsed && 'justify-center px-0',
      )}
      aria-label="Elevate Apparel admin home"
    >
      {collapsed ? (
        <BrandLogo on="light" variant="mark" quality={95} heightClassName="h-7 w-7" />
      ) : (
        <div className="min-w-0">
          <BrandLogo on="light" priority quality={95} heightClassName="h-7" />
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[.14em] text-[#C9A227]">
            Admin Console
          </p>
        </div>
      )}
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-[#FAFAFA]">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[#E5E7EB] bg-[#FFFFFF] transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[68px]' : 'w-60',
        )}
      >
        {brand}
        <NavLinks
          pathname={pathname}
          collapsed={collapsed}
          badges={badges}
          role={user.role}
          onNavigate={() => setMenuOpen(false)}
        />
        {!collapsed ? <ProTipCard /> : null}
        <div className="shrink-0 border-t border-[#E5E7EB] p-3">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[.08em] text-[#555555] transition-colors hover:bg-[#FAFAFA] hover:text-[#111111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeft className="size-4" strokeWidth={1.6} />
            ) : (
              <>
                <PanelLeftClose className="size-4" strokeWidth={1.6} />
                Collapse
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-[#111111]/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-[#E5E7EB] bg-[#FFFFFF] shadow-2xl"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#E5E7EB] px-4">
              <div className="min-w-0">
                <BrandLogo on="light" priority quality={95} heightClassName="h-7" />
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[.14em] text-[#C9A227]">
                  Admin Console
                </p>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-[#555555] transition-colors hover:bg-[#FAFAFA] hover:text-[#111111]"
              >
                <X className="size-4" />
              </button>
            </div>
            <NavLinks
              pathname={pathname}
              collapsed={false}
              badges={badges}
              role={user.role}
              onNavigate={() => setDrawerOpen(false)}
            />
            <ProTipCard />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky top bar */}
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-[#E5E7EB] bg-[#FAFAFA]/95 px-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] backdrop-blur-md sm:px-6">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg border border-[#E5E7EB] p-2 text-[#111111] transition-colors hover:border-[#C9A227]/60 lg:hidden"
          >
            <Menu className="size-4" />
          </button>

          <Breadcrumbs pathname={pathname} />

          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
            <AdminQuickSearch className="hidden w-full max-w-xs md:block lg:max-w-sm" />

            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#555555] transition-colors hover:border-[#C9A227]/60 hover:text-[#111111] xl:inline-flex"
            >
              <Store className="size-3.5" strokeWidth={1.7} />
              View store
            </Link>

            <AdminNotifications
              queues={notificationQueues}
              open={notifOpen}
              onToggle={() => {
                setNotifOpen((value) => !value);
                setMenuOpen(false);
              }}
              onClose={() => setNotifOpen(false)}
            />

            {/* User dropdown */}
            <div className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => {
                  setMenuOpen((value) => !value);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]"
              >
                <span className="flex size-7 items-center justify-center rounded-full border border-[#C9A227]/40 bg-[#FFFFFF] text-[11px] font-bold text-[#C9A227]">
                  {initial}
                </span>
                <span className="hidden min-w-0 text-left leading-tight md:block">
                  <span className="block max-w-[140px] truncate text-[12px] font-semibold text-[#111111]">
                    {displayName}
                  </span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[.08em] text-[#555555]">
                    {displayRole}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    'size-3.5 text-[#555555] transition-transform duration-150',
                    menuOpen && 'rotate-180',
                  )}
                  strokeWidth={1.7}
                />
              </button>
              {menuOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="Close user menu"
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] shadow-[0_16px_48px_-12px_rgba(0,0,0,.15)]"
                  >
                    <div className="border-b border-[#E5E7EB] px-4 py-3">
                      <p className="truncate text-sm font-semibold text-[#111111]">{user.email}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#C9A227]">
                        {displayRole}
                      </p>
                    </div>
                    <div className="p-1.5">
                      <Link
                        href="/"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#555555] transition-colors hover:bg-[#FAFAFA] hover:text-[#111111]"
                      >
                        <Store className="size-4 text-[#555555]" strokeWidth={1.6} />
                        View storefront
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={logout.isPending}
                        onClick={() =>
                          logout.mutate(undefined, { onSuccess: () => router.push('/login') })
                        }
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        {logout.isPending ? (
                          <Loader2 className="size-4 animate-spin" strokeWidth={1.7} />
                        ) : (
                          <LogOut className="size-4" strokeWidth={1.6} />
                        )}
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 sm:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const hydrated = useAppSelector((s) => s.auth.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!isAdminRole(user.role)) {
      router.replace('/');
    }
  }, [hydrated, user, router, pathname]);

  const ready = hydrated && Boolean(user) && isAdminRole(user?.role);

  if (hydrated && user && !isAdminRole(user.role)) {
    return null;
  }

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen bg-[#FAFAFA]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[#E5E7EB] bg-[#FFFFFF] lg:flex">
          <div className="flex h-14 shrink-0 items-center border-b border-[#E5E7EB] px-4">
            <div className="min-w-0">
              <BrandLogo on="light" priority quality={95} heightClassName="h-7" />
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[.14em] text-[#C9A227]">
                Admin Console
              </p>
            </div>
          </div>
          <div className="flex-1 space-y-2 p-3">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-[#E5E7EB]" />
            ))}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center border-b border-[#E5E7EB] bg-[#FAFAFA]/95 px-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] backdrop-blur-md sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-[#555555]">
              Checking admin access…
            </p>
          </header>
          <main
            id="main-content"
            className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 sm:py-8"
          >
            <AdminTableSkeleton />
          </main>
        </div>
      </div>
    );
  }

  return <AdminChrome user={user}>{children}</AdminChrome>;
}

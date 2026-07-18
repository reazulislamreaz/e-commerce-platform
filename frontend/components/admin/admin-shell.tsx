'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useEffect, useState, type PropsWithChildren } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Layers,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Menu,
  Newspaper,
  Package,
  PanelLeftClose,
  PanelLeft,
  RotateCcw,
  Shirt,
  Star,
  Store,
  Tag,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { useLogout } from '@/features/auth/hooks';
import { cn } from '@/lib/utils';
import type { Role } from '@/types/auth';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Operations',
    items: [
      { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
      { href: '/admin/orders', label: 'Orders', icon: Package },
      { href: '/admin/returns', label: 'Returns', icon: RotateCcw },
      { href: '/admin/reviews', label: 'Reviews', icon: Star },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/admin/products', label: 'Products', icon: Shirt },
      { href: '/admin/catalog', label: 'Taxonomy', icon: Layers },
      { href: '/admin/inventory', label: 'Inventory', icon: Warehouse },
      { href: '/admin/coupons', label: 'Coupons', icon: Tag },
    ],
  },
  {
    label: 'Customers',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/contact', label: 'Contact', icon: Mail },
      { href: '/admin/newsletter', label: 'Newsletter', icon: Newspaper },
    ],
  },
];

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
                <ChevronRight aria-hidden className="size-3 shrink-0 text-[#57534b]" />
              ) : null}
              <li className="min-w-0">
                {last ? (
                  <span aria-current="page" className="block truncate text-[#e3bb78]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="block truncate text-[#8b867d] transition-colors hover:text-white"
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

function NavLinks({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Admin" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {navGroups.map((group) => (
        <div key={group.label}>
          {!collapsed ? (
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#6f6a61]">
              {group.label}
            </p>
          ) : null}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-semibold tracking-[.02em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3bb78]',
                    collapsed && 'justify-center px-0',
                    active
                      ? 'bg-[#e3bb78]/10 text-[#e3bb78]'
                      : 'text-[#c9c4bb] hover:bg-white/[0.04] hover:text-white',
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-[#e3bb78]"
                    />
                  ) : null}
                  <Icon
                    className={cn(
                      'size-4 shrink-0 transition-colors',
                      active ? 'text-[#e3bb78]' : 'text-[#8b867d] group-hover:text-[#e3bb78]',
                    )}
                    strokeWidth={1.6}
                  />
                  {!collapsed ? item.label : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const hydrated = useAppSelector((s) => s.auth.hydrated);
  const logout = useLogout();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!drawerOpen && !menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, menuOpen]);

  if (!hydrated || !user || !isAdminRole(user.role)) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 bg-[#0a0a0b] py-20">
        <Loader2 className="size-5 animate-spin text-[#e3bb78]" strokeWidth={1.7} />
        <p className="text-sm text-[#b5b0a8]">Checking admin access…</p>
      </main>
    );
  }

  const initial = (user.firstName?.[0] ?? user.email[0] ?? 'A').toUpperCase();
  const displayRole = user.role.replaceAll('_', ' ');

  const brand = (
    <div
      className={cn(
        'flex h-14 shrink-0 items-center gap-2 border-b border-[#26231f] px-4',
        collapsed && 'justify-center px-0',
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#e5bd79] text-[12px] font-extrabold text-[#18120b]">
        E
      </span>
      {!collapsed ? (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[12px] font-extrabold tracking-[-.01em] text-white">
            Elevate Apparel
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#e0bd7d]">
            Admin Console
          </p>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0a0a0b]">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[#26231f] bg-[#0d0c0b] transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[68px]' : 'w-60',
        )}
      >
        {brand}
        <NavLinks pathname={pathname} collapsed={collapsed} onNavigate={() => setMenuOpen(false)} />
        <div className="shrink-0 border-t border-[#26231f] p-3">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[.08em] text-[#8b867d] transition-colors hover:bg-white/[0.04] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3bb78]',
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
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-[#26231f] bg-[#0d0c0b] shadow-2xl"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#26231f] px-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-[#e5bd79] text-[12px] font-extrabold text-[#18120b]">
                  E
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#e0bd7d]">
                  Admin Console
                </p>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-[#b5b0a8] transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
            <NavLinks pathname={pathname} collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky top bar */}
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-[#26231f] bg-[#0a0a0b]/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg border border-[#37332c] p-2 text-white transition-colors hover:border-[#e3bb78]/60 lg:hidden"
          >
            <Menu className="size-4" />
          </button>

          <Breadcrumbs pathname={pathname} />

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-lg border border-[#37332c] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#d8d4cd] transition-colors hover:border-[#e3bb78]/60 hover:text-white sm:inline-flex"
            >
              <Store className="size-3.5" strokeWidth={1.7} />
              View store
            </Link>

            {/* User dropdown */}
            <div className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((value) => !value)}
                className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3bb78]"
              >
                <span className="flex size-7 items-center justify-center rounded-full border border-[#e3bb78]/40 bg-[#1a1815] text-[11px] font-bold text-[#e3bb78]">
                  {initial}
                </span>
                <ChevronDown
                  className={cn(
                    'size-3.5 text-[#8b867d] transition-transform duration-150',
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
                    className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-[#26231f] bg-[#12110f] shadow-[0_16px_48px_-12px_rgba(0,0,0,.7)]"
                  >
                    <div className="border-b border-[#26231f] px-4 py-3">
                      <p className="truncate text-sm font-semibold text-white">{user.email}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#e0bd7d]">
                        {displayRole}
                      </p>
                    </div>
                    <div className="p-1.5">
                      <Link
                        href="/"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#d8d4cd] transition-colors hover:bg-white/[0.05] hover:text-white"
                      >
                        <Store className="size-4 text-[#8b867d]" strokeWidth={1.6} />
                        View storefront
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={logout.isPending}
                        onClick={() =>
                          logout.mutate(undefined, { onSuccess: () => router.push('/login') })
                        }
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-300 transition-colors hover:bg-red-950/40 disabled:opacity-50"
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

        <main id="main-content" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

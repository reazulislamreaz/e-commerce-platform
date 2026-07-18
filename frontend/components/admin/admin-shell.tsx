'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type PropsWithChildren } from 'react';
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  RotateCcw,
  Star,
  Tag,
  Users,
  Warehouse,
  X,
  Newspaper,
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { useLogout } from '@/features/auth/hooks';
import { cn } from '@/lib/utils';
import type { Role } from '@/types/auth';

const nav: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  roles?: Role[];
}[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'Orders', icon: Package },
  { href: '/admin/returns', label: 'Returns', icon: RotateCcw },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/inventory', label: 'Inventory', icon: Warehouse },
  { href: '/admin/coupons', label: 'Coupons', icon: Tag },
  { href: '/admin/products', label: 'Products', icon: Boxes },
  { href: '/admin/catalog', label: 'Taxonomy', icon: Boxes },
  { href: '/admin/contact', label: 'Contact', icon: Mail },
  { href: '/admin/newsletter', label: 'Newsletter', icon: Newspaper },
  { href: '/admin/users', label: 'Users', icon: Users },
];

function isAdminRole(role: Role | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function AdminShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const hydrated = useAppSelector((s) => s.auth.hydrated);
  const logout = useLogout();
  const [open, setOpen] = useState(false);

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

  if (!hydrated || !user || !isAdminRole(user.role)) {
    return (
      <main className="flex min-h-screen flex-1 items-center justify-center bg-black py-20">
        <p className="text-sm text-[#b5b0a8]">Checking admin access…</p>
      </main>
    );
  }

  const NavLinks = (
    <nav aria-label="Admin" className="space-y-0.5">
      {nav.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-2.5 rounded-[4px] px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[.08em] transition-colors',
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
        onClick={() => logout.mutate(undefined, { onSuccess: () => router.push('/login') })}
        className="flex w-full items-center gap-2.5 rounded-[4px] px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[.08em] text-[#e9e5de] transition-colors hover:bg-[#1a1815] hover:text-red-300"
      >
        <LogOut className="size-3.5 shrink-0" strokeWidth={1.6} />
        Logout
      </button>
    </nav>
  );

  return (
    <main id="main-content" className="min-h-screen flex-1 bg-black">
      <section className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
              Elevate Ops
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-.03em] text-white sm:text-3xl">
              Admin Console
            </h1>
            <p className="mt-1 text-sm text-[#b5b0a8]">
              {user.email} · {user.role.replaceAll('_', ' ')}
            </p>
          </div>
          <button
            type="button"
            className="rounded-[4px] border border-[#37332c] p-2 text-white lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden h-fit rounded-[4px] border border-[#2d2a27] bg-[#111110] p-2 lg:block">
            {NavLinks}
          </aside>
          {open ? (
            <aside
              className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-2 lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Admin navigation"
            >
              {NavLinks}
            </aside>
          ) : null}
          <div className="min-w-0">{children}</div>
        </div>
      </section>
    </main>
  );
}

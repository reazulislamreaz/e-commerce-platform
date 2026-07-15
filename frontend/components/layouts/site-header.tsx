'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Menu, Search, ShoppingCart, User, X } from 'lucide-react';
import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useLogout } from '@/features/auth/hooks';
import { navCategories, searchSuggestions } from '@/features/products/data';

function BrandLogo() {
  return (
    <Link
      href="/"
      className="shrink-0 rounded-md text-2xl font-bold tracking-tight text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      aria-label="ElevateApparel home"
    >
      Elevate<span className="text-indigo-600">Apparel</span>
    </Link>
  );
}

function SearchForm({
  query,
  onQueryChange,
  onSubmit,
  className,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  className?: string;
}) {
  return (
    <form onSubmit={onSubmit} role="search" className={className}>
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search for t-shirts, polos, hoodies…"
          aria-label="Search products"
          className="w-full rounded-full border border-zinc-300 bg-zinc-50 py-2.5 pl-5 pr-11 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="submit"
          aria-label="Search"
          className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-600"
        >
          <Search className="size-4" />
        </button>
      </div>
    </form>
  );
}

export function SiteHeader() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const cartCount = useAppSelector((state) =>
    state.cart.items.reduce((total, item) => total + item.quantity, 0),
  );
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (term) {
      router.push(`/search?q=${encodeURIComponent(term)}`);
      setMobileOpen(false);
    }
  };

  const iconLinkClass =
    'relative flex size-10 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600';

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>
      <p className="bg-zinc-950 py-1.5 text-center text-xs font-medium tracking-wide text-white">
        NEW SEASON COLLECTION — FREE DELIVERY ON ORDERS OVER ৳2,000
      </p>
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-5">
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-indigo-600 lg:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
        <BrandLogo />
        <SearchForm
          query={query}
          onQueryChange={setQuery}
          onSubmit={submitSearch}
          className="hidden flex-1 md:block md:max-w-xl"
        />
        <nav aria-label="Account and cart" className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link href="/wishlist" aria-label="Wishlist" className={iconLinkClass}>
            <Heart className="size-5" />
          </Link>
          <Link
            href="/cart"
            aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
            className={iconLinkClass}
          >
            <ShoppingCart className="size-5" />
            {cartCount > 0 && (
              <span className="absolute right-0 top-0 flex size-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
          {user ? (
            <div className="hidden items-center gap-2 pl-1 sm:flex">
              <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-800">
                <span className="flex size-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <User className="size-4" />
                </span>
                Hi, {user.firstName ?? user.email}
              </span>
              <button
                type="button"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50"
              >
                {logout.isPending ? 'Logging out…' : 'Logout'}
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 pl-1 sm:flex">
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-indigo-600"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
      <div className="mx-auto hidden max-w-7xl items-center gap-2 px-4 pb-2.5 text-xs text-zinc-500 md:flex">
        <span className="font-medium">Popular:</span>
        {searchSuggestions.map((suggestion) => (
          <Link
            key={suggestion}
            href={`/search?q=${encodeURIComponent(suggestion)}`}
            className="rounded-full border border-zinc-200 px-2.5 py-0.5 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            {suggestion}
          </Link>
        ))}
      </div>
      <nav aria-label="Main navigation" className="hidden border-t border-zinc-100 lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-7 px-4 py-2.5 text-sm font-medium text-zinc-700">
          {[
            { name: 'Home', href: '/' },
            { name: 'Shop All', href: '/shop' },
            { name: 'New Arrivals', href: '/new-arrivals' },
            { name: 'Top Selling', href: '/top-selling' },
            ...navCategories.map((category) => ({
              name: category.name,
              href: `/category/${category.slug}`,
            })),
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-sm py-0.5 transition-colors hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {item.name}
            </Link>
          ))}
          <Link
            href="/contact"
            className="ml-auto rounded-sm py-0.5 transition-colors hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Contact Us
          </Link>
        </div>
      </nav>
      {mobileOpen && (
        <nav aria-label="Mobile navigation" className="border-t border-zinc-100 lg:hidden">
          <div className="space-y-1 px-4 py-4 text-sm font-medium text-zinc-700">
            <SearchForm
              query={query}
              onQueryChange={setQuery}
              onSubmit={submitSearch}
              className="mb-3"
            />
            {[
              { name: 'Home', href: '/' },
              { name: 'Shop All', href: '/shop' },
              { name: 'New Arrivals', href: '/new-arrivals' },
              { name: 'Top Selling', href: '/top-selling' },
              ...navCategories.map((category) => ({
                name: category.name,
                href: `/category/${category.slug}`,
              })),
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2.5 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                onClick={() => setMobileOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="mt-2 border-t border-zinc-100 pt-3">
              {user ? (
                <button
                  type="button"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                  className="block w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 disabled:opacity-50"
                >
                  {logout.isPending ? 'Logging out…' : `Logout (${user.firstName ?? user.email})`}
                </button>
              ) : (
                <div className="flex gap-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 rounded-full border border-zinc-300 px-4 py-2.5 text-center transition-colors hover:border-zinc-400"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 rounded-full bg-indigo-600 px-4 py-2.5 text-center font-semibold text-white transition-colors hover:bg-indigo-500"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

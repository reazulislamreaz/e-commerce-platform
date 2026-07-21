'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';
import { adminNavItems } from '@/components/admin/admin-nav';
import { cn } from '@/lib/utils';

type SearchResult = {
  href: string;
  label: string;
  hint: string;
  icon?: (typeof adminNavItems)[number]['icon'];
};

function buildResults(query: string): SearchResult[] {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();

  const destinations = adminNavItems
    .filter(
      (item) =>
        !lower ||
        item.label.toLowerCase().includes(lower) ||
        item.keywords?.some((keyword) => keyword.includes(lower)),
    )
    .map((item) => ({
      href: item.href,
      label: item.label,
      hint: 'Go to section',
      icon: item.icon,
    }));

  if (!trimmed) return destinations.slice(0, 6);

  const lookups: SearchResult[] = [];
  if (trimmed.includes('@')) {
    lookups.push({
      href: `/admin/orders?email=${encodeURIComponent(trimmed)}`,
      label: `Orders from “${trimmed}”`,
      hint: 'Search orders by email',
    });
  } else if (/^#?[A-Za-z0-9-]{4,}$/.test(trimmed)) {
    lookups.push({
      href: `/admin/orders?number=${encodeURIComponent(trimmed.replace(/^#/, ''))}`,
      label: `Order “${trimmed.replace(/^#/, '')}”`,
      hint: 'Search orders by number',
    });
  }

  return [...destinations.slice(0, 5), ...lookups];
}

export function AdminQuickSearch({ className }: { className?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => buildResults(query), [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function navigate(result: SearchResult | undefined) {
    if (!result) return;
    router.push(result.href);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#555555]"
        strokeWidth={1.7}
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls="admin-quick-search-results"
        aria-label="Search admin"
        placeholder="Search anything…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
          } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, results.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter') {
            event.preventDefault();
            navigate(results[activeIndex]);
          }
        }}
        className="w-full rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] py-2 pl-9 pr-12 text-[13px] text-[#111111] outline-none transition-colors placeholder:text-[#555555] hover:border-[#D1D5DB] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/15 [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-[#E5E7EB] bg-[#FFFFFF] px-1.5 py-0.5 text-[10px] font-semibold text-[#555555]"
      >
        ⌘K
      </kbd>

      {open && results.length > 0 ? (
        <ul
          id="admin-quick-search-results"
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] py-1.5 shadow-[0_16px_48px_-12px_rgba(0,0,0,.15)]"
        >
          {results.map((result, index) => {
            const Icon = result.icon ?? Search;
            return (
              <li
                key={`${result.href}-${result.label}`}
                role="option"
                aria-selected={index === activeIndex}
              >
                <button
                  type="button"
                  onClick={() => navigate(result)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors',
                    index === activeIndex
                      ? 'bg-[#C9A227]/[0.08] text-[#111111]'
                      : 'text-[#555555] hover:bg-[#FAFAFA]',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4 shrink-0',
                      index === activeIndex ? 'text-[#C9A227]' : 'text-[#555555]',
                    )}
                    strokeWidth={1.6}
                  />
                  <span className="min-w-0 flex-1 truncate">{result.label}</span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[.08em] text-[#555555]">
                    {result.hint}
                  </span>
                  {index === activeIndex ? (
                    <CornerDownLeft
                      aria-hidden
                      className="size-3.5 shrink-0 text-[#555555]"
                      strokeWidth={1.7}
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

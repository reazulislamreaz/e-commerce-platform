'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  SEARCH_DIALOG_LIMIT,
  searchSuggestions,
  usePrefetchProduct,
  useProductSearch,
} from '@/features/products';
import { formatTaka } from '@/lib/currency';
import { readStorage, writeStorage } from '@/lib/storage';

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const prefetchProduct = usePrefetchProduct();
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [recentVersion, setRecentVersion] = useState(0);

  const recent = useMemo(() => {
    if (!open) return [] as string[];
    void recentVersion;
    return readStorage<string[]>('recentSearches', []);
  }, [open, recentVersion]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      window.clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const search = useProductSearch(deferredQuery, open && deferredQuery.trim().length > 0);
  const results = (search.data ?? []).slice(0, SEARCH_DIALOG_LIMIT);
  const isSearching =
    deferredQuery.trim().length > 0 &&
    (search.isLoading || search.isFetching) &&
    results.length === 0;
  const showNoMatches =
    deferredQuery.trim().length > 0 &&
    !search.isLoading &&
    !search.isFetching &&
    results.length === 0;

  const commitSearch = (value: string) => {
    const q = value.trim();
    if (!q) return;
    const next = [q, ...recent.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(
      0,
      6,
    );
    writeStorage('recentSearches', next);
    setRecentVersion((v) => v + 1);
    onClose();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-[#FAFAFA]/75"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search products"
        className="relative mx-auto mt-16 w-[min(100%-1.5rem,640px)] rounded-[4px] border border-[#E5E7EB] bg-[#FAFAFA] shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-3 py-2.5">
          <Search className="size-4 text-[#C9A227]" strokeWidth={1.7} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitSearch(query);
            }}
            placeholder="Search tees, hoodies, joggers…"
            className="w-full bg-transparent py-2 text-sm text-[#111111] outline-none placeholder:text-[#555555]"
          />
          <button type="button" aria-label="Close" onClick={onClose} className="p-1 text-[#555555]">
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          {!query && (
            <>
              {recent.length > 0 && (
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#555555]">
                      Recent Searches
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        writeStorage('recentSearches', []);
                        setRecentVersion((v) => v + 1);
                      }}
                      className="text-[10px] uppercase text-[#555555] hover:text-[#C9A227]"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => commitSearch(item)}
                        className="rounded-[4px] border border-[#E5E7EB] px-2.5 py-1 text-[11px] text-[#555555] hover:border-[#C9A227]"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#555555]">
                Popular Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {searchSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => commitSearch(item)}
                    className="rounded-[4px] border border-[#E5E7EB] px-2.5 py-1 text-[11px] text-[#555555] hover:border-[#C9A227]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </>
          )}

          {query && (
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#555555]">
                Suggestions
              </p>
              {isSearching ? (
                <ul className="space-y-2" aria-busy="true" aria-label="Searching">
                  {Array.from({ length: 3 }, (_, i) => (
                    <li key={i} className="flex items-center gap-3 rounded-[4px] p-2" aria-hidden>
                      <div className="h-12 w-10 animate-pulse rounded-[4px] bg-white" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3 w-[70%] animate-pulse rounded-[4px] bg-white" />
                        <div className="h-2.5 w-[40%] animate-pulse rounded-[4px] bg-white" />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : showNoMatches ? (
                <p className="text-sm text-[#555555]">No matches. Try another keyword.</p>
              ) : (
                <ul className="space-y-2">
                  {results.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/product/${product.slug}`}
                        onClick={onClose}
                        onPointerEnter={() => prefetchProduct(product.slug)}
                        onFocus={() => prefetchProduct(product.slug)}
                        className="flex items-center gap-3 rounded-[4px] p-2 transition-colors hover:bg-white"
                      >
                        <div className="relative h-12 w-10 overflow-hidden rounded-[4px] bg-[#e4e3e1]">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-[#111111]">{product.name}</p>
                          <p className="text-[11px] text-[#555555]">{product.category}</p>
                        </div>
                        <p className="text-sm font-semibold text-[#C9A227]">
                          {formatTaka(product.price)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => commitSearch(query)}
                className="mt-4 w-full rounded-[4px] border border-[#111111] bg-[#111111] py-2.5 text-[11px] font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
              >
                View all results
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

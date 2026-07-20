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
    deferredQuery.trim().length > 0 && (search.isLoading || search.isFetching) && results.length === 0;
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
        className="absolute inset-0 bg-black/75"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search products"
        className="relative mx-auto mt-16 w-[min(100%-1.5rem,640px)] rounded-[4px] border border-[#2d2a27] bg-[#0a0a0b] shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-[#2d2a27] px-3 py-2.5">
          <Search className="size-4 text-[#e3bb78]" strokeWidth={1.7} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitSearch(query);
            }}
            placeholder="Search tees, hoodies, joggers…"
            className="w-full bg-transparent py-2 text-sm text-white outline-none placeholder:text-[#8b867d]"
          />
          <button type="button" aria-label="Close" onClick={onClose} className="p-1 text-[#b5b0a8]">
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          {!query && (
            <>
              {recent.length > 0 && (
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#b5b0a8]">
                      Recent Searches
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        writeStorage('recentSearches', []);
                        setRecentVersion((v) => v + 1);
                      }}
                      className="text-[10px] uppercase text-[#8b867d] hover:text-[#e3bb78]"
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
                        className="rounded-[4px] border border-[#37332c] px-2.5 py-1 text-[11px] text-[#e9e5de] hover:border-[#e3bb78]"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#b5b0a8]">
                Popular Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {searchSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => commitSearch(item)}
                    className="rounded-[4px] border border-[#37332c] px-2.5 py-1 text-[11px] text-[#e9e5de] hover:border-[#e3bb78]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </>
          )}

          {query && (
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#b5b0a8]">
                Suggestions
              </p>
              {isSearching ? (
                <ul className="space-y-2" aria-busy="true" aria-label="Searching">
                  {Array.from({ length: 3 }, (_, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-[4px] p-2"
                      aria-hidden
                    >
                      <div className="h-12 w-10 animate-pulse rounded-[4px] bg-[#1a1815]" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3 w-[70%] animate-pulse rounded-[4px] bg-[#1a1815]" />
                        <div className="h-2.5 w-[40%] animate-pulse rounded-[4px] bg-[#1a1815]" />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : showNoMatches ? (
                <p className="text-sm text-[#b5b0a8]">No matches. Try another keyword.</p>
              ) : (
                <ul className="space-y-2">
                  {results.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/product/${product.slug}`}
                        onClick={onClose}
                        onPointerEnter={() => prefetchProduct(product.slug)}
                        onFocus={() => prefetchProduct(product.slug)}
                        className="flex items-center gap-3 rounded-[4px] p-2 transition-colors hover:bg-[#1a1815]"
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
                          <p className="truncate text-sm text-white">{product.name}</p>
                          <p className="text-[11px] text-[#8b867d]">{product.category}</p>
                        </div>
                        <p className="text-sm font-semibold text-[#e5c17d]">
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
                className="mt-4 w-full rounded-[4px] border border-[#efc677] bg-[#e5bd79] py-2.5 text-[11px] font-bold uppercase text-[#18120b]"
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

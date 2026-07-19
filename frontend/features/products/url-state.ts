import type { ProductCollection, ProductFilters, ProductSort } from './types';
import { DEFAULT_FILTERS } from './filter';
import { PAGE_SIZE } from './constants';

const SORT_VALUES: ProductSort[] = [
  'featured',
  'newest',
  'price-asc',
  'price-desc',
  'rating',
  'discount',
];

function csv(value: string | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function num(value: string | null): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseCatalogSearchParams(
  params: URLSearchParams,
  base?: Partial<ProductFilters>,
): {
  filters: ProductFilters;
  sort: ProductSort;
  page: number;
  pageSize: number;
} {
  const filters: ProductFilters = {
    ...DEFAULT_FILTERS,
    ...base,
    collections: (csv(params.get('collections')) as ProductCollection[]).length
      ? (csv(params.get('collections')) as ProductCollection[])
      : ((base?.collections as ProductCollection[] | undefined) ?? []),
    categories: csv(params.get('categories')).length
      ? csv(params.get('categories'))
      : (base?.categories ?? []),
    subcategories: csv(params.get('subcategories')).length
      ? csv(params.get('subcategories'))
      : (base?.subcategories ?? []),
    brands: csv(params.get('brands')).length ? csv(params.get('brands')) : (base?.brands ?? []),
    sizes: csv(params.get('sizes')).length ? csv(params.get('sizes')) : (base?.sizes ?? []),
    colors: csv(params.get('colors')).length ? csv(params.get('colors')) : (base?.colors ?? []),
    minPrice: params.has('minPrice') ? num(params.get('minPrice')) : (base?.minPrice ?? null),
    maxPrice: params.has('maxPrice') ? num(params.get('maxPrice')) : (base?.maxPrice ?? null),
    availability:
      (params.get('availability') as ProductFilters['availability']) ||
      base?.availability ||
      'all',
    discount: params.has('discount')
      ? params.get('discount') === '1' || params.get('discount') === 'true'
      : Boolean(base?.discount),
    minRating: params.has('minRating') ? num(params.get('minRating')) : (base?.minRating ?? null),
    query: params.get('q')?.trim() || params.get('query')?.trim() || base?.query || '',
  };

  const sortParam = params.get('sort') as ProductSort | null;
  const sort = sortParam && SORT_VALUES.includes(sortParam) ? sortParam : 'featured';
  const page = Math.max(1, Number(params.get('page') || 1) || 1);

  return { filters, sort, page, pageSize: PAGE_SIZE };
}

export function catalogStateToSearchParams(input: {
  filters: ProductFilters;
  sort: ProductSort;
  page: number;
  preserve?: Record<string, string | undefined>;
}): URLSearchParams {
  const params = new URLSearchParams();
  const { filters, sort, page } = input;

  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.collections.length) params.set('collections', filters.collections.join(','));
  if (filters.categories.length) params.set('categories', filters.categories.join(','));
  if (filters.subcategories.length) params.set('subcategories', filters.subcategories.join(','));
  if (filters.brands.length) params.set('brands', filters.brands.join(','));
  if (filters.sizes.length) params.set('sizes', filters.sizes.join(','));
  if (filters.colors.length) params.set('colors', filters.colors.join(','));
  if (filters.minPrice != null) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice != null) params.set('maxPrice', String(filters.maxPrice));
  if (filters.availability !== 'all') params.set('availability', filters.availability);
  if (filters.discount) params.set('discount', '1');
  if (filters.minRating != null) params.set('minRating', String(filters.minRating));
  if (sort !== 'featured') params.set('sort', sort);
  if (page > 1) params.set('page', String(page));

  if (input.preserve) {
    for (const [key, value] of Object.entries(input.preserve)) {
      if (value && !params.has(key)) params.set(key, value);
    }
  }

  return params;
}

const SCROLL_KEY = 'elevate:catalog:scroll';

export function saveCatalogScroll(pathname: string, search: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      SCROLL_KEY,
      JSON.stringify({ key: `${pathname}?${search}`, y: window.scrollY }),
    );
  } catch {
    /* ignore quota */
  }
}

export function restoreCatalogScroll(pathname: string, search: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { key?: string; y?: number };
    if (parsed.key === `${pathname}?${search}` && typeof parsed.y === 'number') {
      requestAnimationFrame(() => window.scrollTo({ top: parsed.y, behavior: 'instant' as ScrollBehavior }));
    }
  } catch {
    /* ignore */
  }
}

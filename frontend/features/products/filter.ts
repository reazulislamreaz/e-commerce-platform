import type { CatalogProduct, ProductFilters, ProductSort } from './types';
import { normalizeProduct } from './types';

export const DEFAULT_FILTERS: ProductFilters = {
  collections: [],
  categories: [],
  subcategories: [],
  brands: [],
  sizes: [],
  colors: [],
  minPrice: null,
  maxPrice: null,
  availability: 'all',
  discount: false,
  minRating: null,
  query: '',
};

export function countActiveFilters(filters: ProductFilters): number {
  let count = 0;
  count += filters.collections.length;
  count += filters.categories.length;
  count += filters.subcategories.length;
  count += filters.brands.length;
  count += filters.sizes.length;
  count += filters.colors.length;
  if (filters.minPrice != null || filters.maxPrice != null) count += 1;
  if (filters.availability !== 'all') count += 1;
  if (filters.discount) count += 1;
  if (filters.minRating != null) count += 1;
  if (filters.query.trim()) count += 1;
  return count;
}

export function filterProducts(
  products: CatalogProduct[],
  filters: ProductFilters,
): CatalogProduct[] {
  const q = filters.query.trim().toLowerCase();

  return products.filter((raw) => {
    const product = normalizeProduct(raw);
    if (filters.collections.length && !filters.collections.includes(product.collection)) {
      return false;
    }
    if (filters.categories.length && !filters.categories.includes(product.category)) {
      return false;
    }
    if (filters.subcategories.length && !filters.subcategories.includes(product.subcategory)) {
      return false;
    }
    if (filters.brands.length && !filters.brands.includes(product.brand)) {
      return false;
    }
    if (filters.sizes.length && !filters.sizes.some((size) => product.sizes.includes(size))) {
      return false;
    }
    if (
      filters.colors.length &&
      !filters.colors.some(
        (color) =>
          product.color === color || product.colors.some((option) => option.name === color),
      )
    ) {
      return false;
    }
    if (filters.minPrice != null && product.price < filters.minPrice) return false;
    if (filters.maxPrice != null && product.price > filters.maxPrice) return false;
    if (filters.availability === 'in-stock' && !product.inStock) return false;
    if (filters.availability === 'out-of-stock' && product.inStock) return false;
    if (filters.discount && !(product.onSale && product.compareAtPrice)) return false;
    if (filters.minRating != null && product.rating < filters.minRating) return false;
    if (q) {
      const haystack = [
        product.name,
        product.category,
        product.subcategory,
        product.brand,
        product.color,
        product.description,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function sortProducts(products: CatalogProduct[], sort: ProductSort): CatalogProduct[] {
  const next = [...products];
  switch (sort) {
    case 'newest':
      return next.sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)));
    case 'price-asc':
      return next.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return next.sort((a, b) => b.price - a.price);
    case 'rating':
      return next.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case 'discount':
      return next.sort((a, b) => {
        const da = a.compareAtPrice ? 1 - a.price / a.compareAtPrice : 0;
        const db = b.compareAtPrice ? 1 - b.price / b.compareAtPrice : 0;
        return db - da;
      });
    case 'featured':
    default:
      return next;
  }
}

export function paginateProducts<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    totalPages,
    total: items.length,
  };
}

export function getFilterFacets(products: CatalogProduct[]) {
  const normalized = products.map(normalizeProduct);
  const categories = [...new Set(normalized.map((p) => p.category))].sort();
  const subcategories = [...new Set(normalized.map((p) => p.subcategory))].sort();
  const brands = [...new Set(normalized.map((p) => p.brand))].sort();
  const sizes = [...new Set(normalized.flatMap((p) => p.sizes))];
  const colors = [...new Set(normalized.flatMap((p) => p.colors.map((c) => c.name)))].sort();
  const prices = normalized.map((p) => p.price);
  return {
    categories,
    subcategories,
    brands,
    sizes,
    colors,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
  };
}

import type { CatalogProduct, ProductFilters, ProductSort } from './types';
import {
  getAllProducts,
  getNewArrivals,
  getProductById,
  getProductBySlug,
  getProductsByCollection,
  getRelatedProducts,
  getSaleProducts,
  searchProducts,
} from './data';
import { filterProducts, paginateProducts, sortProducts } from './filter';

/**
 * Product catalog access layer.
 * Swap `localProductCatalog` for an HTTP implementation when the products API ships.
 * Server Components may keep calling sync helpers in `data.ts` for SSG;
 * client features should prefer this async API + TanStack Query.
 */
export interface ProductCatalog {
  list(params?: {
    filters?: Partial<ProductFilters>;
    sort?: ProductSort;
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: CatalogProduct[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }>;
  getBySlug(slug: string): Promise<CatalogProduct | null>;
  getById(id: string): Promise<CatalogProduct | null>;
  search(query: string, limit?: number): Promise<CatalogProduct[]>;
  related(product: CatalogProduct, limit?: number): Promise<CatalogProduct[]>;
  byCollection(collection: 'men' | 'women'): Promise<CatalogProduct[]>;
  newArrivals(): Promise<CatalogProduct[]>;
  onSale(): Promise<CatalogProduct[]>;
}

export const localProductCatalog: ProductCatalog = {
  async list({ filters, sort = 'featured', page = 1, pageSize = 8 } = {}) {
    const base = getAllProducts();
    const filtered = filters
      ? filterProducts(base, {
          collections: filters.collections ?? [],
          categories: filters.categories ?? [],
          subcategories: filters.subcategories ?? [],
          brands: filters.brands ?? [],
          sizes: filters.sizes ?? [],
          colors: filters.colors ?? [],
          minPrice: filters.minPrice ?? null,
          maxPrice: filters.maxPrice ?? null,
          availability: filters.availability ?? 'all',
          discount: filters.discount ?? false,
          minRating: filters.minRating ?? null,
          query: filters.query ?? '',
        })
      : base;
    return paginateProducts(sortProducts(filtered, sort), page, pageSize);
  },
  async getBySlug(slug) {
    return getProductBySlug(slug) ?? null;
  },
  async getById(id) {
    return getProductById(id) ?? null;
  },
  async search(query, limit = 8) {
    return searchProducts(query, limit);
  },
  async related(product, limit = 4) {
    return getRelatedProducts(product, limit);
  },
  async byCollection(collection) {
    return getProductsByCollection(collection);
  },
  async newArrivals() {
    return getNewArrivals();
  },
  async onSale() {
    return getSaleProducts();
  },
};

/** Active catalog implementation — replace with `httpProductCatalog` later. */
export const productCatalog: ProductCatalog = localProductCatalog;

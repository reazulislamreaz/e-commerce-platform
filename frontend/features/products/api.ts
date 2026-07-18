import axios from 'axios';
import { apiClient } from '@/services/api-client';
import type { ApiResponse, OffsetPageMeta } from '@/types/api';
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
  }): Promise<ProductPage>;
  getBySlug(slug: string): Promise<CatalogProduct | null>;
  getById(id: string): Promise<CatalogProduct | null>;
  getByIds(ids: string[]): Promise<CatalogProduct[]>;
  search(query: string, limit?: number): Promise<CatalogProduct[]>;
  related(product: CatalogProduct, limit?: number): Promise<CatalogProduct[]>;
  byCollection(collection: 'men' | 'women'): Promise<CatalogProduct[]>;
  newArrivals(): Promise<CatalogProduct[]>;
  onSale(): Promise<CatalogProduct[]>;
  facets(): Promise<ProductFacets>;
}

export interface ProductPage {
  items: CatalogProduct[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProductFacets {
  categories: string[];
  subcategories: string[];
  brands: string[];
  sizes: string[];
  colors: string[];
  minPrice: number;
  maxPrice: number;
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
  async getByIds(ids) {
    return ids.flatMap((id) => {
      const product = getProductById(id);
      return product ? [product] : [];
    });
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
  async facets() {
    const { getFilterFacets } = await import('./filter');
    return getFilterFacets(getAllProducts());
  },
};

function queryParams(params: {
  filters?: Partial<ProductFilters>;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}) {
  const filters = params.filters;
  return {
    collections: filters?.collections?.join(',') || undefined,
    categories: filters?.categories?.join(',') || undefined,
    subcategories: filters?.subcategories?.join(',') || undefined,
    brands: filters?.brands?.join(',') || undefined,
    sizes: filters?.sizes?.join(',') || undefined,
    colors: filters?.colors?.join(',') || undefined,
    minPrice: filters?.minPrice ?? undefined,
    maxPrice: filters?.maxPrice ?? undefined,
    availability:
      filters?.availability && filters.availability !== 'all'
        ? filters.availability
        : undefined,
    discount: filters?.discount || undefined,
    minRating: filters?.minRating ?? undefined,
    query: filters?.query?.trim() || undefined,
    sort: params.sort,
    page: params.page,
    pageSize: params.pageSize,
  };
}

async function nullableProduct(request: Promise<{ data: ApiResponse<CatalogProduct> }>) {
  try {
    return (await request).data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

/** HTTP implementation backed by the Nest catalog module. */
export const httpProductCatalog: ProductCatalog = {
  async list(params = {}) {
    const { data } = await apiClient.get<ApiResponse<CatalogProduct[], OffsetPageMeta>>(
      '/products',
      { params: queryParams(params) },
    );
    const meta = data.meta ?? { page: 1, pageSize: 8, total: data.data.length, totalPages: 1 };
    return { items: data.data, ...meta };
  },
  getBySlug(slug) {
    return nullableProduct(apiClient.get(`/products/${encodeURIComponent(slug)}`));
  },
  getById(id) {
    return nullableProduct(apiClient.get(`/products/id/${encodeURIComponent(id)}`));
  },
  async getByIds(ids) {
    if (ids.length === 0) return [];
    const { data } = await apiClient.get<ApiResponse<CatalogProduct[]>>('/products/by-ids', {
      params: { ids: ids.join(',') },
    });
    return data.data;
  },
  async search(query, limit = 8) {
    if (!query.trim()) return [];
    const { data } = await apiClient.get<ApiResponse<CatalogProduct[]>>('/products/search', {
      params: { q: query, limit },
    });
    return data.data;
  },
  async related(product, limit = 4) {
    const { data } = await apiClient.get<ApiResponse<CatalogProduct[]>>(
      `/products/${encodeURIComponent(product.slug)}/related`,
      { params: { limit } },
    );
    return data.data;
  },
  async byCollection(collection) {
    return (
      await this.list({
        filters: { collections: [collection] },
        page: 1,
        pageSize: 100,
      })
    ).items;
  },
  async newArrivals() {
    const { data } = await apiClient.get<ApiResponse<CatalogProduct[]>>(
      '/products/new-arrivals',
      { params: { limit: 100 } },
    );
    return data.data;
  },
  async onSale() {
    const { data } = await apiClient.get<ApiResponse<CatalogProduct[]>>('/products/on-sale', {
      params: { limit: 100 },
    });
    return data.data;
  },
  async facets() {
    const { data } = await apiClient.get<ApiResponse<ProductFacets>>('/products/facets');
    return data.data;
  },
};

export const productCatalog: ProductCatalog = httpProductCatalog;

/**
 * Product feature public API.
 * Server Components: sync getters from `data.ts`.
 * Client features: `hooks.ts` + TanStack Query against `productCatalog`.
 */
export {
  productCatalog,
  httpProductCatalog,
  localProductCatalog,
  type ProductCatalog,
  type ProductFacets,
  type ProductPage,
} from './api';

export {
  productKeys,
  useProductList,
  useProductSearch,
  useProductBySlug,
  useProductsByIds,
  useProductFacets,
} from './hooks';

export {
  PAGE_SIZE,
  PRICE_PRESETS,
  SEARCH_DIALOG_LIMIT,
  SEARCH_PAGE_LIMIT,
  searchSuggestions,
} from './constants';

export {
  getAllProducts,
  getNewArrivals,
  getProductById,
  getProductBySlug,
  getProductsByCollection,
  getRelatedProducts,
  getSaleProducts,
  searchProducts,
} from './data';

export type { CatalogProduct, ProductFilters, ProductSort } from './types';
export { normalizeProduct } from './types';

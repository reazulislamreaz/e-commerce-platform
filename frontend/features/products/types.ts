export type ProductCollection = 'men' | 'women' | 'kids' | 'unisex';

export interface ProductColorOption {
  name: string;
  hex: string;
}

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  stock: number;
  sku: string;
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  verified?: boolean;
}

export interface CatalogProduct {
  id: string;
  /** Temporary migration key for browser state created before the catalog API. */
  legacyId?: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  subcategory?: string;
  brand?: string;
  /** Gender / collection bucket for filtering */
  collection: ProductCollection;
  color: string;
  colors?: ProductColorOption[];
  sizes?: string[];
  image: string;
  images?: string[];
  description?: string;
  variants?: ProductVariant[];
  inStock?: boolean;
  rating?: number;
  reviewCount?: number;
  reviews?: ProductReview[];
  isNew?: boolean;
  onSale?: boolean;
  /** Legacy gradient hue for placeholder cards */
  imageHue?: number;
}

export interface ProductFilters {
  collections: ProductCollection[];
  categories: string[];
  subcategories: string[];
  brands: string[];
  sizes: string[];
  colors: string[];
  minPrice: number | null;
  maxPrice: number | null;
  availability: 'all' | 'in-stock' | 'out-of-stock';
  discount: boolean;
  minRating: number | null;
  query: string;
}

export type ProductSort =
  'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'discount';

/** Normalize optional catalog fields for filtering / PDP. */
export function normalizeProduct(
  product: CatalogProduct,
): Required<
  Pick<
    CatalogProduct,
    | 'subcategory'
    | 'brand'
    | 'colors'
    | 'sizes'
    | 'images'
    | 'description'
    | 'variants'
    | 'inStock'
    | 'rating'
    | 'reviewCount'
    | 'reviews'
  >
> &
  CatalogProduct {
  return {
    ...product,
    subcategory: product.subcategory ?? product.category,
    brand: product.brand ?? 'Elevate Apparel',
    colors: product.colors ?? [{ name: product.color, hex: '#111111' }],
    sizes: product.sizes ?? ['S', 'M', 'L', 'XL'],
    images: product.images?.length ? product.images : [product.image],
    description:
      product.description ??
      'Premium Elevate construction — soft hand-feel, clean silhouette, made to elevate your everyday rotation.',
    variants: product.variants ?? [],
    inStock: product.inStock ?? true,
    rating: product.rating ?? 0,
    reviewCount: product.reviewCount ?? 0,
    reviews: product.reviews ?? [],
  };
}

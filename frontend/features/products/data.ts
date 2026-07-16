import type { CatalogProduct } from './types';

/** Elevate Apparel storefront catalog — uses homepage imagery until products API ships. */

export const catalogProducts: CatalogProduct[] = [
  {
    id: 'p1',
    name: 'Elevate Oversized Tee',
    slug: 'elevate-oversized-tee',
    price: 1190,
    compareAtPrice: 1490,
    category: 'T-Shirts',
    collection: 'men',
    color: 'Black',
    image: '/images/home/product-1.webp',
    isNew: true,
    onSale: true,
  },
  {
    id: 'p2',
    name: 'Essential Tee',
    slug: 'essential-tee',
    price: 1090,
    category: 'T-Shirts',
    collection: 'unisex',
    color: 'Off White',
    image: '/images/home/product-2.webp',
    isNew: true,
  },
  {
    id: 'p3',
    name: 'Elevate Hoodie',
    slug: 'elevate-hoodie',
    price: 1890,
    compareAtPrice: 2290,
    category: 'Hoodies',
    collection: 'men',
    color: 'Black',
    image: '/images/home/product-3.webp',
    isNew: true,
    onSale: true,
  },
  {
    id: 'p4',
    name: 'Minimal Tee',
    slug: 'minimal-tee',
    price: 1090,
    category: 'T-Shirts',
    collection: 'unisex',
    color: 'Beige',
    image: '/images/home/product-4.webp',
  },
  {
    id: 'p5',
    name: 'Elevate Jogger',
    slug: 'elevate-jogger',
    price: 1590,
    compareAtPrice: 1890,
    category: 'Bottoms',
    collection: 'men',
    color: 'Black',
    image: '/images/home/product-5.webp',
    onSale: true,
  },
  {
    id: 'p6',
    name: "Women's Hoodie",
    slug: 'womens-hoodie',
    price: 1890,
    category: 'Hoodies',
    collection: 'women',
    color: 'Cream',
    image: '/images/home/product-6.webp',
    isNew: true,
  },
  {
    id: 'p7',
    name: 'Everyday Crew Tee',
    slug: 'everyday-crew-tee',
    price: 990,
    compareAtPrice: 1290,
    category: 'T-Shirts',
    collection: 'men',
    color: 'Charcoal',
    image: '/images/home/instagram-2.webp',
    onSale: true,
  },
  {
    id: 'p8',
    name: 'Soft Lounge Hoodie',
    slug: 'soft-lounge-hoodie',
    price: 1990,
    category: 'Hoodies',
    collection: 'women',
    color: 'Ivory',
    image: '/images/home/instagram-7.webp',
    isNew: true,
  },
  {
    id: 'p9',
    name: 'Street Cap Tee',
    slug: 'street-cap-tee',
    price: 1190,
    category: 'T-Shirts',
    collection: 'unisex',
    color: 'Black',
    image: '/images/home/instagram-1.webp',
    isNew: true,
  },
  {
    id: 'p10',
    name: 'City Jogger',
    slug: 'city-jogger',
    price: 1490,
    compareAtPrice: 1790,
    category: 'Bottoms',
    collection: 'unisex',
    color: 'Black',
    image: '/images/home/instagram-5.webp',
    onSale: true,
  },
  {
    id: 'p11',
    name: 'Studio Crop Hoodie',
    slug: 'studio-crop-hoodie',
    price: 1790,
    category: 'Hoodies',
    collection: 'women',
    color: 'Sand',
    image: '/images/home/instagram-6.webp',
  },
  {
    id: 'p12',
    name: 'Heritage Logo Tee',
    slug: 'heritage-logo-tee',
    price: 1290,
    compareAtPrice: 1590,
    category: 'T-Shirts',
    collection: 'men',
    color: 'Black',
    image: '/images/home/instagram-8.webp',
    isNew: true,
    onSale: true,
  },
];

export function getAllProducts(): CatalogProduct[] {
  return catalogProducts;
}

export function getProductsByCollection(collection: 'men' | 'women'): CatalogProduct[] {
  return catalogProducts.filter((p) => p.collection === collection || p.collection === 'unisex');
}

export function getNewArrivals(): CatalogProduct[] {
  return catalogProducts.filter((p) => p.isNew);
}

export function getSaleProducts(): CatalogProduct[] {
  return catalogProducts.filter((p) => p.onSale && p.compareAtPrice);
}

export function getProductBySlug(slug: string): CatalogProduct | undefined {
  return catalogProducts.find((p) => p.slug === slug);
}

// --- Legacy homepage placeholders (kept for existing imports) ---

export const searchSuggestions = ['T-Shirt', 'Polo', 'Hoodie', 'Joggers', 'Kurti', 'Kids'];

export const navCategories = [
  { name: 'Men', slug: 'men' },
  { name: 'Women', slug: 'women' },
  { name: 'Kids', slug: 'kids' },
  { name: 'Teens', slug: 'teens' },
  { name: 'Sports', slug: 'sports' },
];

export const homeCategories = [];
export const homeSections = [];

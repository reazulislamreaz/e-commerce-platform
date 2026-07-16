import type { CatalogProduct, ProductVariant } from './types';

function variantsFor(
  productId: string,
  sizes: string[],
  colors: { name: string; hex: string }[],
  stock = 12,
): ProductVariant[] {
  return colors.flatMap((color) =>
    sizes.map((size) => ({
      id: `${productId}-${color.name}-${size}`.toLowerCase().replace(/\s+/g, '-'),
      size,
      color: color.name,
      stock: size === 'XXL' ? Math.max(0, stock - 10) : stock,
      sku: `${productId.toUpperCase()}-${color.name.slice(0, 3).toUpperCase()}-${size}`,
    })),
  );
}

const teeSizes = ['S', 'M', 'L', 'XL', 'XXL'];
const bottomSizes = ['S', 'M', 'L', 'XL'];

/** Elevate Apparel storefront catalog — uses homepage imagery until products API ships. */
export const catalogProducts: CatalogProduct[] = [
  {
    id: 'p1',
    name: 'Elevate Oversized Tee',
    slug: 'elevate-oversized-tee',
    price: 1190,
    compareAtPrice: 1490,
    category: 'T-Shirts',
    subcategory: 'Oversized',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Black',
    colors: [
      { name: 'Black', hex: '#111111' },
      { name: 'Charcoal', hex: '#3a3a3a' },
    ],
    sizes: teeSizes,
    image: '/images/home/product-1.webp',
    images: ['/images/home/product-1.webp', '/images/home/instagram-1.webp', '/images/home/instagram-8.webp'],
    description:
      'Relaxed oversized fit in heavyweight cotton. Clean Elevate branding, soft hand-feel, built for everyday rotation.',
    variants: variantsFor('p1', teeSizes, [
      { name: 'Black', hex: '#111111' },
      { name: 'Charcoal', hex: '#3a3a3a' },
    ]),
    inStock: true,
    rating: 4.7,
    reviewCount: 28,
    reviews: [
      {
        id: 'r1',
        author: 'Rahim K.',
        rating: 5,
        title: 'Perfect oversized fit',
        body: 'Soft fabric and the cut is exactly what I wanted. Will buy again.',
        createdAt: '2026-05-12',
        verified: true,
      },
      {
        id: 'r2',
        author: 'Nadia S.',
        rating: 4,
        title: 'Great everyday tee',
        body: 'True to size for oversized. Color holds after wash.',
        createdAt: '2026-04-02',
        verified: true,
      },
    ],
    isNew: true,
    onSale: true,
  },
  {
    id: 'p2',
    name: 'Essential Tee',
    slug: 'essential-tee',
    price: 1090,
    category: 'T-Shirts',
    subcategory: 'Crew Neck',
    brand: 'Elevate Apparel',
    collection: 'unisex',
    color: 'Off White',
    colors: [
      { name: 'Off White', hex: '#f3efe8' },
      { name: 'Black', hex: '#111111' },
    ],
    sizes: teeSizes,
    image: '/images/home/product-2.webp',
    images: ['/images/home/product-2.webp', '/images/home/product-4.webp'],
    description: 'A wardrobe staple — midweight cotton, clean crew neck, effortless everyday silhouette.',
    variants: variantsFor('p2', teeSizes, [
      { name: 'Off White', hex: '#f3efe8' },
      { name: 'Black', hex: '#111111' },
    ], 18),
    inStock: true,
    rating: 4.5,
    reviewCount: 41,
    reviews: [
      {
        id: 'r3',
        author: 'Imran A.',
        rating: 5,
        title: 'Daily driver',
        body: 'Soft, durable, and looks premium. Pair with everything.',
        createdAt: '2026-06-01',
        verified: true,
      },
    ],
    isNew: true,
  },
  {
    id: 'p3',
    name: 'Elevate Hoodie',
    slug: 'elevate-hoodie',
    price: 1890,
    compareAtPrice: 2290,
    category: 'Hoodies',
    subcategory: 'Pullover',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Black',
    colors: [
      { name: 'Black', hex: '#111111' },
      { name: 'Navy', hex: '#1a2332' },
    ],
    sizes: teeSizes,
    image: '/images/home/product-3.webp',
    images: ['/images/home/product-3.webp', '/images/home/instagram-7.webp'],
    description: 'Heavyweight fleece hoodie with a structured hood and brushed interior for all-day comfort.',
    variants: variantsFor('p3', teeSizes, [
      { name: 'Black', hex: '#111111' },
      { name: 'Navy', hex: '#1a2332' },
    ], 8),
    inStock: true,
    rating: 4.8,
    reviewCount: 63,
    reviews: [
      {
        id: 'r4',
        author: 'Farhan M.',
        rating: 5,
        title: 'Warm and premium',
        body: 'Best hoodie I own. Thick fleece without feeling bulky.',
        createdAt: '2026-03-18',
        verified: true,
      },
    ],
    isNew: true,
    onSale: true,
  },
  {
    id: 'p4',
    name: 'Minimal Tee',
    slug: 'minimal-tee',
    price: 1090,
    category: 'T-Shirts',
    subcategory: 'Crew Neck',
    brand: 'Elevate Apparel',
    collection: 'unisex',
    color: 'Beige',
    colors: [
      { name: 'Beige', hex: '#d4c4a8' },
      { name: 'Sand', hex: '#c4b59a' },
    ],
    sizes: teeSizes,
    image: '/images/home/product-4.webp',
    images: ['/images/home/product-4.webp', '/images/home/product-2.webp'],
    description: 'Quiet luxury basics — tonal stitching, refined drape, zero logos on the front.',
    variants: variantsFor('p4', teeSizes, [
      { name: 'Beige', hex: '#d4c4a8' },
      { name: 'Sand', hex: '#c4b59a' },
    ]),
    inStock: true,
    rating: 4.3,
    reviewCount: 19,
    reviews: [],
  },
  {
    id: 'p5',
    name: 'Elevate Jogger',
    slug: 'elevate-jogger',
    price: 1590,
    compareAtPrice: 1890,
    category: 'Bottoms',
    subcategory: 'Joggers',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Black',
    colors: [
      { name: 'Black', hex: '#111111' },
      { name: 'Charcoal', hex: '#3a3a3a' },
    ],
    sizes: bottomSizes,
    image: '/images/home/product-5.webp',
    images: ['/images/home/product-5.webp', '/images/home/instagram-5.webp'],
    description: 'Tapered jogger with elastic cuff, zip pockets, and a soft brushed interior.',
    variants: variantsFor('p5', bottomSizes, [
      { name: 'Black', hex: '#111111' },
      { name: 'Charcoal', hex: '#3a3a3a' },
    ], 10),
    inStock: true,
    rating: 4.6,
    reviewCount: 34,
    reviews: [
      {
        id: 'r5',
        author: 'Sabbir H.',
        rating: 5,
        title: 'Comfort king',
        body: 'Great taper and the fabric feels premium. Ideal for travel days.',
        createdAt: '2026-02-20',
        verified: true,
      },
    ],
    onSale: true,
  },
  {
    id: 'p6',
    name: "Women's Hoodie",
    slug: 'womens-hoodie',
    price: 1890,
    category: 'Hoodies',
    subcategory: 'Pullover',
    brand: 'Elevate Apparel',
    collection: 'women',
    color: 'Cream',
    colors: [
      { name: 'Cream', hex: '#f0e6d8' },
      { name: 'Ivory', hex: '#f7f2ea' },
    ],
    sizes: teeSizes,
    image: '/images/home/product-6.webp',
    images: ['/images/home/product-6.webp', '/images/home/instagram-6.webp'],
    description: 'Soft-touch fleece hoodie tailored for a flattering feminine fit without sacrificing comfort.',
    variants: variantsFor('p6', teeSizes, [
      { name: 'Cream', hex: '#f0e6d8' },
      { name: 'Ivory', hex: '#f7f2ea' },
    ], 9),
    inStock: true,
    rating: 4.9,
    reviewCount: 22,
    reviews: [
      {
        id: 'r6',
        author: 'Ayesha R.',
        rating: 5,
        title: 'Soft and flattering',
        body: 'Love the cream color. Fits true to size and feels luxurious.',
        createdAt: '2026-05-28',
        verified: true,
      },
    ],
    isNew: true,
  },
  {
    id: 'p7',
    name: 'Everyday Crew Tee',
    slug: 'everyday-crew-tee',
    price: 990,
    compareAtPrice: 1290,
    category: 'T-Shirts',
    subcategory: 'Crew Neck',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Charcoal',
    colors: [
      { name: 'Charcoal', hex: '#3a3a3a' },
      { name: 'Black', hex: '#111111' },
    ],
    sizes: teeSizes,
    image: '/images/home/instagram-2.webp',
    images: ['/images/home/instagram-2.webp', '/images/home/product-1.webp'],
    description: 'Everyday crew in charcoal — breathable cotton with a refined, slightly structured shoulder.',
    variants: variantsFor('p7', teeSizes, [
      { name: 'Charcoal', hex: '#3a3a3a' },
      { name: 'Black', hex: '#111111' },
    ], 15),
    inStock: true,
    rating: 4.4,
    reviewCount: 17,
    reviews: [],
    onSale: true,
  },
  {
    id: 'p8',
    name: 'Soft Lounge Hoodie',
    slug: 'soft-lounge-hoodie',
    price: 1990,
    category: 'Hoodies',
    subcategory: 'Lounge',
    brand: 'Elevate Apparel',
    collection: 'women',
    color: 'Ivory',
    colors: [
      { name: 'Ivory', hex: '#f7f2ea' },
      { name: 'Sand', hex: '#c4b59a' },
    ],
    sizes: teeSizes,
    image: '/images/home/instagram-7.webp',
    images: ['/images/home/instagram-7.webp', '/images/home/product-6.webp'],
    description: 'Ultra-soft lounge hoodie designed for weekends, travel, and slow mornings.',
    variants: variantsFor('p8', teeSizes, [
      { name: 'Ivory', hex: '#f7f2ea' },
      { name: 'Sand', hex: '#c4b59a' },
    ], 6),
    inStock: true,
    rating: 4.7,
    reviewCount: 11,
    reviews: [],
    isNew: true,
  },
  {
    id: 'p9',
    name: 'Street Cap Tee',
    slug: 'street-cap-tee',
    price: 1190,
    category: 'T-Shirts',
    subcategory: 'Graphic',
    brand: 'Elevate Apparel',
    collection: 'unisex',
    color: 'Black',
    colors: [{ name: 'Black', hex: '#111111' }],
    sizes: teeSizes,
    image: '/images/home/instagram-1.webp',
    images: ['/images/home/instagram-1.webp', '/images/home/instagram-8.webp'],
    description: 'Street-ready graphic tee with a cropped shoulder line and durable print.',
    variants: variantsFor('p9', teeSizes, [{ name: 'Black', hex: '#111111' }], 4),
    inStock: true,
    rating: 4.2,
    reviewCount: 9,
    reviews: [],
    isNew: true,
  },
  {
    id: 'p10',
    name: 'City Jogger',
    slug: 'city-jogger',
    price: 1490,
    compareAtPrice: 1790,
    category: 'Bottoms',
    subcategory: 'Joggers',
    brand: 'Elevate Apparel',
    collection: 'unisex',
    color: 'Black',
    colors: [
      { name: 'Black', hex: '#111111' },
      { name: 'Olive', hex: '#4a5240' },
    ],
    sizes: bottomSizes,
    image: '/images/home/instagram-5.webp',
    images: ['/images/home/instagram-5.webp', '/images/home/product-5.webp'],
    description: 'City-ready jogger with a clean taper and hidden zip pocket for everyday carry.',
    variants: variantsFor(
      'p10',
      bottomSizes,
      [
        { name: 'Black', hex: '#111111' },
        { name: 'Olive', hex: '#4a5240' },
      ],
      0,
    ),
    inStock: false,
    rating: 4.1,
    reviewCount: 14,
    reviews: [],
    onSale: true,
  },
  {
    id: 'p11',
    name: 'Studio Crop Hoodie',
    slug: 'studio-crop-hoodie',
    price: 1790,
    category: 'Hoodies',
    subcategory: 'Crop',
    brand: 'Elevate Apparel',
    collection: 'women',
    color: 'Sand',
    colors: [
      { name: 'Sand', hex: '#c4b59a' },
      { name: 'Cream', hex: '#f0e6d8' },
    ],
    sizes: ['XS', 'S', 'M', 'L'],
    image: '/images/home/instagram-6.webp',
    images: ['/images/home/instagram-6.webp', '/images/home/product-6.webp'],
    description: 'Cropped studio hoodie with ribbed hem — light layering for movement and street style.',
    variants: variantsFor(
      'p11',
      ['XS', 'S', 'M', 'L'],
      [
        { name: 'Sand', hex: '#c4b59a' },
        { name: 'Cream', hex: '#f0e6d8' },
      ],
      7,
    ),
    inStock: true,
    rating: 4.6,
    reviewCount: 16,
    reviews: [],
  },
  {
    id: 'p12',
    name: 'Heritage Logo Tee',
    slug: 'heritage-logo-tee',
    price: 1290,
    compareAtPrice: 1590,
    category: 'T-Shirts',
    subcategory: 'Logo',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Black',
    colors: [
      { name: 'Black', hex: '#111111' },
      { name: 'Off White', hex: '#f3efe8' },
    ],
    sizes: teeSizes,
    image: '/images/home/instagram-8.webp',
    images: ['/images/home/instagram-8.webp', '/images/home/product-1.webp'],
    description: 'Heritage Elevate mark on premium cotton — a signature piece for the collection.',
    variants: variantsFor('p12', teeSizes, [
      { name: 'Black', hex: '#111111' },
      { name: 'Off White', hex: '#f3efe8' },
    ], 11),
    inStock: true,
    rating: 4.8,
    reviewCount: 52,
    reviews: [
      {
        id: 'r7',
        author: 'Tanvir I.',
        rating: 5,
        title: 'Signature piece',
        body: 'Logo placement is clean and the fabric quality is excellent.',
        createdAt: '2026-06-15',
        verified: true,
      },
    ],
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

export function getProductById(id: string): CatalogProduct | undefined {
  return catalogProducts.find((p) => p.id === id);
}

export function getRelatedProducts(product: CatalogProduct, limit = 4): CatalogProduct[] {
  return catalogProducts
    .filter(
      (p) =>
        p.id !== product.id &&
        (p.category === product.category || p.collection === product.collection),
    )
    .slice(0, limit);
}

export function searchProducts(query: string, limit = 8): CatalogProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return catalogProducts
    .filter((p) =>
      [p.name, p.category, p.subcategory, p.brand, p.color].join(' ').toLowerCase().includes(q),
    )
    .slice(0, limit);
}

export { PAGE_SIZE, PRICE_PRESETS, searchSuggestions } from './constants';

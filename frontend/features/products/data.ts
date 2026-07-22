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

const shirtSizes = ['S', 'M', 'L', 'XL', 'XXL'];
const kidsSizes = ['4Y', '6Y', '8Y', '10Y', '12Y'];
const walletSizes = ['OS'];

const IMG = {
  urbanHorizon: '/images/products/urban-horizon-stripe.webp',
  peachPlaid: '/images/products/peach-plaid-studio.webp',
  orangePlaid: '/images/products/orange-plaid-folded.webp',
  lightBluePatchwork: '/images/products/light-blue-patchwork-folded.webp',
  whitePeachWindowpane: '/images/products/white-peach-windowpane.webp',
  blueEssentialsStack: '/images/products/blue-essentials-stack.webp',
  abstractGeometric: '/images/products/abstract-geometric-lifestyle.webp',
  ubaidWallet: '/images/products/ubaid-wallet-brown.webp',
  maroonTeal: '/images/products/maroon-teal-check-folded.webp',
  terracottaFloral: '/images/products/terracotta-floral-studio.webp',
  maroonBlock: '/images/products/maroon-block-check-studio.webp',
  patternedStack: '/images/products/patterned-collection-stack.webp',
  blueCircle: '/images/products/blue-circle-pattern-folded.webp',
  rustFloral: '/images/products/rust-floral-folded.webp',
  ubaidWalletDetail: '/images/products/ubaid-wallet-detail.webp',
  dustyBlue: '/images/products/dusty-blue-windowpane.webp',
  slateBlue: '/images/products/slate-blue-windowpane.webp',
  blueDressStack: '/images/products/blue-dress-shirt-stack.webp',
} as const;

/**
 * Elevate Apparel storefront catalog — real product photography.
 * Seeded into PostgreSQL via `backend/prisma/seed` (idempotent upsert by slug).
 */
export const catalogProducts: CatalogProduct[] = [
  {
    id: 'p1',
    name: 'Urban Horizon Distressed Stripe Shirt',
    slug: 'urban-horizon-distressed-stripe-shirt',
    price: 3490,
    compareAtPrice: 4290,
    category: 'Shirts',
    subcategory: 'Casual Button-Downs',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Olive Stripe',
    colors: [
      { name: 'Olive Stripe', hex: '#6b705c' },
      { name: 'Slate Stripe', hex: '#5c6570' },
    ],
    sizes: shirtSizes,
    image: IMG.urbanHorizon,
    images: [IMG.urbanHorizon, IMG.abstractGeometric, IMG.patternedStack],
    imageAlts: [
      'Man wearing grey and olive distressed vertical stripe button-down with camel contrast cuffs on a city rooftop at sunset',
      'Elevate Apparel urban sophistication lifestyle look with abstract geometric print shirt',
      'Stack of Elevate patterned dress shirts in abstract and botanical prints',
    ],
    shortDescription:
      'Slim-fit button-down with earth-tone distressed stripes and camel contrast collar and cuffs.',
    description:
      'Urban Horizon Distressed Stripe Shirt brings rooftop-ready polish to everyday rotation. Soft cotton with a vertical ikat-style wash in olive, slate, and cream; camel contrast inner collar and turned-back cuffs; pearlescent buttons. Slim tailored silhouette for smart-casual and evening city looks.',
    tags: ['slim-fit', 'vertical-stripes', 'earth-tones', 'contrast-cuffs', 'urban-style', 'new'],
    seoTitle: 'Urban Horizon Distressed Stripe Shirt | Elevate Apparel',
    seoDescription:
      'Shop the Urban Horizon Distressed Stripe Shirt — slim-fit earth-tone stripes with camel contrast cuffs. Premium Elevate Apparel menswear.',
    variants: variantsFor('p1', shirtSizes, [
      { name: 'Olive Stripe', hex: '#6b705c' },
      { name: 'Slate Stripe', hex: '#5c6570' },
    ]),
    inStock: true,
    rating: 4.8,
    reviewCount: 36,
    reviews: [
      {
        id: 'r1',
        author: 'Rahim K.',
        rating: 5,
        title: 'Rooftop-ready fit',
        body: 'The contrast cuffs elevate the whole look. Fabric feels premium and the slim cut is sharp.',
        createdAt: '2026-05-12',
        verified: true,
      },
      {
        id: 'r2',
        author: 'Nadia S.',
        rating: 4,
        title: 'Great gift for him',
        body: 'Colors are richer in person. Runs true to size for slim fit.',
        createdAt: '2026-04-02',
        verified: true,
      },
    ],
    isNew: true,
    onSale: true,
  },
  {
    id: 'p2',
    name: 'Peach & White Plaid Button-Down',
    slug: 'peach-white-plaid-button-down',
    price: 2990,
    category: 'Shirts',
    subcategory: 'Casual Button-Downs',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Peach Plaid',
    colors: [
      { name: 'Peach Plaid', hex: '#e8b89a' },
      { name: 'White', hex: '#f7f7f7' },
    ],
    sizes: shirtSizes,
    image: IMG.peachPlaid,
    images: [IMG.peachPlaid, IMG.whitePeachWindowpane, IMG.orangePlaid],
    imageAlts: [
      'Man in peach and white plaid button-down shirt against a neutral studio background',
      'Man wearing white and peach windowpane check casual shirt',
      'Folded Elevate orange plaid premium cotton dress shirt with brand hangtag',
    ],
    shortDescription:
      'Classic peach-on-white plaid button-down with chest pocket and tailored fit.',
    description:
      'A crisp peach-and-white plaid button-down built for spring-through-fall rotation. Breathable cotton-blend weave, pointed collar, single spade chest pocket, and a clean slim silhouette that pairs with charcoal trousers or denim.',
    tags: ['plaid', 'peach', 'button-down', 'casual', 'bestseller'],
    seoTitle: 'Peach & White Plaid Button-Down Shirt | Elevate Apparel',
    seoDescription:
      'Shop Elevate Apparel peach and white plaid button-down — tailored fit, chest pocket, breathable cotton blend.',
    variants: variantsFor(
      'p2',
      shirtSizes,
      [
        { name: 'Peach Plaid', hex: '#e8b89a' },
        { name: 'White', hex: '#f7f7f7' },
      ],
      18,
    ),
    inStock: true,
    rating: 4.6,
    reviewCount: 48,
    reviews: [
      {
        id: 'r3',
        author: 'Imran A.',
        rating: 5,
        title: 'Office to dinner',
        body: 'Light enough for Dhaka heat, looks sharp tucked in. Will buy another.',
        createdAt: '2026-06-01',
        verified: true,
      },
    ],
    isNew: true,
  },
  {
    id: 'p3',
    name: 'Premium Orange Plaid Cotton Shirt',
    slug: 'elevate-premium-orange-plaid-cotton-shirt',
    price: 3290,
    compareAtPrice: 3890,
    category: 'Shirts',
    subcategory: 'Dress Shirts',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Orange Plaid',
    colors: [{ name: 'Orange Plaid', hex: '#d4a574' }],
    sizes: shirtSizes,
    image: IMG.orangePlaid,
    images: [IMG.orangePlaid, IMG.peachPlaid, IMG.lightBluePatchwork],
    imageAlts: [
      'Folded white and orange plaid Elevate Apparel cotton shirt with leather gloves and brass compass',
      'Man modeling peach and white plaid Elevate button-down',
      'Folded Elevate light blue textured patchwork dress shirt with cufflinks',
    ],
    shortDescription:
      '100% premium cotton regular-fit dress shirt with dobby texture and peach plaid accents.',
    description:
      'Elevate Premium Orange Plaid Cotton Shirt — regular fit, 100% premium cotton with a subtle dobby weave and soft orange plaid. Gold “Elevate” chest embroidery, pointed collar, and presentation-ready finish. Product of Bangladesh; built for boardroom and elevated weekend wear.',
    tags: ['100% cotton', 'plaid', 'regular-fit', 'premium', 'dress-shirt'],
    seoTitle: 'Premium Orange Plaid Cotton Shirt | Elevate Apparel',
    seoDescription:
      'Regular-fit 100% premium cotton dress shirt with orange plaid and dobby texture from Elevate Apparel.',
    variants: variantsFor('p3', shirtSizes, [{ name: 'Orange Plaid', hex: '#d4a574' }], 14),
    inStock: true,
    rating: 4.9,
    reviewCount: 62,
    reviews: [
      {
        id: 'r4',
        author: 'Farhan M.',
        rating: 5,
        title: 'True premium cotton',
        body: 'Hangtag quality matches the fabric. Embroidery is clean and the fit is comfortable.',
        createdAt: '2026-03-18',
        verified: true,
      },
    ],
    onSale: true,
  },
  {
    id: 'p4',
    name: 'Signature Light Blue Patchwork Dress Shirt',
    slug: 'signature-light-blue-patchwork-shirt',
    price: 3590,
    category: 'Shirts',
    subcategory: 'Dress Shirts',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Light Blue',
    colors: [
      { name: 'Light Blue', hex: '#9eb8d4' },
      { name: 'Powder Blue', hex: '#b8c9dc' },
    ],
    sizes: shirtSizes,
    image: IMG.lightBluePatchwork,
    images: [IMG.lightBluePatchwork, IMG.blueCircle, IMG.blueEssentialsStack],
    imageAlts: [
      'Elevate light blue textured patchwork dress shirt folded on wood with gold cufflinks',
      'Elevate blue concentric circle pattern dress shirt on dark wood',
      'Stack of Elevate blue gingham, stripe, and solid dress shirts',
    ],
    shortDescription:
      'Powder-blue tonal patchwork dress shirt with textured squares and luxury presentation.',
    description:
      'Signature Light Blue Patchwork Dress Shirt features tonal checkered squares — fine grids, seigaiha waves, and diagonal hatching — for depth without loud contrast. Soft sheen cotton, white buttons, pointed collar. Styled for professional settings with cufflink-ready cuffs.',
    tags: ['light-blue', 'patchwork', 'formal', 'textured', 'premium'],
    seoTitle: 'Signature Light Blue Patchwork Dress Shirt | Elevate Apparel',
    seoDescription:
      'Shop Elevate Apparel signature light blue textured patchwork dress shirt — premium cotton, formal finish.',
    variants: variantsFor(
      'p4',
      shirtSizes,
      [
        { name: 'Light Blue', hex: '#9eb8d4' },
        { name: 'Powder Blue', hex: '#b8c9dc' },
      ],
      10,
    ),
    inStock: true,
    rating: 4.7,
    reviewCount: 29,
    reviews: [],
    isNew: true,
  },
  {
    id: 'p5',
    name: 'White Peach Windowpane Check Shirt',
    slug: 'white-peach-windowpane-check-shirt',
    price: 2890,
    category: 'Shirts',
    subcategory: 'Casual Button-Downs',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'White Peach',
    colors: [{ name: 'White Peach', hex: '#f5e6dc' }],
    sizes: shirtSizes,
    image: IMG.whitePeachWindowpane,
    images: [IMG.whitePeachWindowpane, IMG.peachPlaid, IMG.dustyBlue],
    imageAlts: [
      'Man in white long-sleeve shirt with orange windowpane check against grey paneled wall',
      'Man in peach and white plaid button-down studio portrait',
      'Man in dusty blue windowpane check shirt with dark denim',
    ],
    shortDescription:
      'Large-scale white and peach windowpane check with grey accents and a modern tailored fit.',
    description:
      'White Peach Windowpane Check Shirt — crisp white base, soft orange windowpane grid with fine grey companions. Pointed collar, chest pocket, curved hem. Lightweight cotton for smart-casual with black chinos or jeans.',
    tags: ['windowpane', 'peach', 'checkered', 'casual', 'slim-fit'],
    seoTitle: 'White Peach Windowpane Check Shirt | Elevate Apparel',
    seoDescription:
      'Shop the white and peach windowpane check casual shirt — tailored fit from Elevate Apparel.',
    variants: variantsFor('p5', shirtSizes, [{ name: 'White Peach', hex: '#f5e6dc' }], 16),
    inStock: true,
    rating: 4.5,
    reviewCount: 21,
    reviews: [],
    isNew: true,
  },
  {
    id: 'p6',
    name: 'Abstract Geometric Print Button-Down',
    slug: 'abstract-geometric-print-shirt',
    price: 3690,
    compareAtPrice: 4290,
    category: 'Shirts',
    subcategory: 'Printed Shirts',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Multi Geometric',
    colors: [{ name: 'Multi Geometric', hex: '#c9b87a' }],
    sizes: shirtSizes,
    image: IMG.abstractGeometric,
    images: [IMG.abstractGeometric, IMG.urbanHorizon, IMG.patternedStack],
    imageAlts: [
      'Man in abstract watercolor geometric print shirt on city rooftop — Elevate Apparel urban sophistication',
      'Man in distressed stripe shirt leaning on rooftop railing at golden hour',
      'Stack of Elevate abstract, floral, and geometric print shirts',
    ],
    shortDescription:
      'Watercolor geometric print button-down — yellow, sky blue, pink, and grey blocks on white.',
    description:
      'Abstract Geometric Print Button-Down redefines urban sophistication. Overlapping watercolor rectangles in muted yellow, sky blue, soft pink, and grey on a white base. Slim fit, rolled-sleeve friendly, tucked or untucked with charcoal trousers. Statement piece for office-to-evening.',
    tags: ['abstract', 'geometric', 'urban', 'printed', 'featured'],
    seoTitle: 'Abstract Geometric Print Button-Down | Elevate Apparel',
    seoDescription:
      'Shop Elevate Apparel abstract geometric print shirt — urban sophistication, slim-fit button-down.',
    variants: variantsFor('p6', shirtSizes, [{ name: 'Multi Geometric', hex: '#c9b87a' }], 9),
    inStock: true,
    rating: 4.8,
    reviewCount: 41,
    reviews: [
      {
        id: 'r5',
        author: 'Sabbir H.',
        rating: 5,
        title: 'Conversation starter',
        body: 'Print is artistic without being loud. Got compliments the first wear.',
        createdAt: '2026-02-20',
        verified: true,
      },
    ],
    isNew: true,
    onSale: true,
  },
  {
    id: 'p7',
    name: 'Maroon & Teal Checkered Dress Shirt',
    slug: 'maroon-teal-checkered-dress-shirt',
    price: 3390,
    category: 'Shirts',
    subcategory: 'Dress Shirts',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Maroon Teal',
    colors: [
      { name: 'Maroon Teal', hex: '#6b2d3c' },
      { name: 'Burgundy', hex: '#5c2433' },
    ],
    sizes: shirtSizes,
    image: IMG.maroonTeal,
    images: [IMG.maroonTeal, IMG.maroonBlock, IMG.rustFloral],
    imageAlts: [
      'Elevate maroon and teal checkered regular-fit dress shirt with watch and compass on valet tray',
      'Man modeling maroon and charcoal block-check long-sleeve shirt',
      'Folded Elevate rust floral print regular-fit shirt on wooden tray',
    ],
    shortDescription:
      'Regular-fit maroon and teal multi-check dress shirt with pinstripe accents — size 16 | 41.',
    description:
      'Maroon & Teal Checkered Dress Shirt — deep burgundy and teal-grey checks with fine horizontal pinstripe detail. Matching maroon buttons, pointed collar, regular fit. A gentleman’s collection staple for evening and formal days.',
    tags: ['maroon', 'checkered', 'regular-fit', 'formal', 'luxury'],
    seoTitle: 'Maroon & Teal Checkered Dress Shirt | Elevate Apparel',
    seoDescription:
      'Shop Elevate Apparel maroon and teal checkered regular-fit dress shirt — premium formal menswear.',
    variants: variantsFor(
      'p7',
      shirtSizes,
      [
        { name: 'Maroon Teal', hex: '#6b2d3c' },
        { name: 'Burgundy', hex: '#5c2433' },
      ],
      11,
    ),
    inStock: true,
    rating: 4.7,
    reviewCount: 33,
    reviews: [],
  },
  {
    id: 'p8',
    name: 'Terracotta Floral Slim-Fit Shirt',
    slug: 'terracotta-floral-slim-fit-shirt',
    price: 3190,
    compareAtPrice: 3790,
    category: 'Shirts',
    subcategory: 'Printed Shirts',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Terracotta Floral',
    colors: [{ name: 'Terracotta Floral', hex: '#c45c3e' }],
    sizes: shirtSizes,
    image: IMG.terracottaFloral,
    images: [IMG.terracottaFloral, IMG.rustFloral, IMG.patternedStack],
    imageAlts: [
      'Man modeling white slim-fit shirt with terracotta floral foliage print and chest pocket',
      'Folded Elevate rust botanical print regular-fit shirt with gold cufflinks',
      'Stack of Elevate patterned shirts including floral and abstract prints',
    ],
    shortDescription:
      'Breathable slim-fit shirt with distressed terracotta floral print on textured white cotton.',
    description:
      'Terracotta Floral Slim-Fit Shirt — white textured weave with warm rust foliage print, block-print character, pointed collar, and open chest pocket. Roll the sleeves for summer evenings or keep them down for smart-casual days.',
    tags: ['floral', 'terracotta', 'slim-fit', 'summer', 'printed'],
    seoTitle: 'Terracotta Floral Slim-Fit Shirt | Elevate Apparel',
    seoDescription:
      'Shop Elevate Apparel terracotta floral slim-fit button-down — breathable cotton for warm days.',
    variants: variantsFor('p8', shirtSizes, [{ name: 'Terracotta Floral', hex: '#c45c3e' }], 13),
    inStock: true,
    rating: 4.6,
    reviewCount: 27,
    reviews: [
      {
        id: 'r6',
        author: 'Ayesha R.',
        rating: 5,
        title: 'Bought for my husband',
        body: 'Print is unique and the slim fit looks intentional. Great for dinners out.',
        createdAt: '2026-05-28',
        verified: true,
      },
    ],
    isNew: true,
    onSale: true,
  },
  {
    id: 'p9',
    name: 'Maroon Modern Block-Check Shirt',
    slug: 'maroon-modern-block-check-shirt',
    price: 3090,
    category: 'Shirts',
    subcategory: 'Casual Button-Downs',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Maroon Check',
    colors: [{ name: 'Maroon Check', hex: '#7a3040' }],
    sizes: shirtSizes,
    image: IMG.maroonBlock,
    images: [IMG.maroonBlock, IMG.maroonTeal, IMG.slateBlue],
    imageAlts: [
      'Man modeling maroon and charcoal modern block-check dress shirt with grey trousers',
      'Folded Elevate maroon teal checkered dress shirt with accessories',
      'Man in slate blue windowpane check shirt studio portrait',
    ],
    shortDescription:
      'Bold maroon block-check shirt with charcoal squares and textured detailing — slim fit.',
    description:
      'Maroon Modern Block-Check Shirt upgrades office and evening attire with a large-scale geometric check. Color-matched maroon buttons, patch chest pocket, tailored slim silhouette. Pair with charcoal or black trousers.',
    tags: ['maroon', 'block-check', 'slim-fit', 'office', 'new-arrival'],
    seoTitle: 'Maroon Modern Block-Check Shirt | Elevate Apparel',
    seoDescription:
      'Shop Elevate Apparel maroon modern block-check slim-fit shirt for sharp contemporary looks.',
    variants: variantsFor('p9', shirtSizes, [{ name: 'Maroon Check', hex: '#7a3040' }], 12),
    inStock: true,
    rating: 4.4,
    reviewCount: 18,
    reviews: [],
    isNew: true,
  },
  {
    id: 'p10',
    name: 'Blue Circle Pattern Dress Shirt',
    slug: 'elevate-blue-circle-pattern-dress-shirt',
    price: 3490,
    category: 'Shirts',
    subcategory: 'Dress Shirts',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Deep Blue',
    colors: [
      { name: 'Deep Blue', hex: '#2a4a6e' },
      { name: 'Navy', hex: '#1a3050' },
    ],
    sizes: shirtSizes,
    image: IMG.blueCircle,
    images: [IMG.blueCircle, IMG.lightBluePatchwork, IMG.blueDressStack],
    imageAlts: [
      'Folded Elevate blue concentric circle pattern dress shirt with cufflinks and compass',
      'Folded Elevate light blue patchwork dress shirt on wood',
      'Stack of five Elevate blue dress shirts in gingham, stripe, and solid',
    ],
    shortDescription:
      'Deep blue dress shirt with overlapping concentric circle print and refined finish.',
    description:
      'Elevate Signature Blue Circle Pattern Dress Shirt — intricate overlapping swirls in tonal blue for modern depth. Smooth cotton weave, matching buttons, branded hangtag presentation. Ideal for meetings and formal evenings.',
    tags: ['blue', 'geometric', 'dress-shirt', 'business', 'elevate'],
    seoTitle: 'Blue Circle Pattern Dress Shirt | Elevate Apparel',
    seoDescription:
      'Shop Elevate Apparel blue concentric circle pattern dress shirt — premium geometric formalwear.',
    variants: variantsFor(
      'p10',
      shirtSizes,
      [
        { name: 'Deep Blue', hex: '#2a4a6e' },
        { name: 'Navy', hex: '#1a3050' },
      ],
      8,
    ),
    inStock: true,
    rating: 4.8,
    reviewCount: 44,
    reviews: [
      {
        id: 'r7',
        author: 'Tanvir I.',
        rating: 5,
        title: 'Subtle luxury',
        body: 'Pattern reads refined up close. Excellent for client meetings.',
        createdAt: '2026-06-15',
        verified: true,
      },
    ],
  },
  {
    id: 'p11',
    name: 'Signature Rust Floral Regular Fit Shirt',
    slug: 'elevate-signature-rust-floral-shirt',
    price: 3290,
    category: 'Shirts',
    subcategory: 'Printed Shirts',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Rust Floral',
    colors: [{ name: 'Rust Floral', hex: '#a85a3c' }],
    sizes: shirtSizes,
    image: IMG.rustFloral,
    images: [IMG.rustFloral, IMG.terracottaFloral, IMG.orangePlaid],
    imageAlts: [
      'Folded Elevate signature rust floral regular-fit shirt on wooden tray with leather accessories',
      'Man wearing terracotta floral print slim-fit shirt in studio',
      'Folded Elevate orange plaid premium cotton shirt',
    ],
    shortDescription:
      'Regular-fit shirt with rust botanical motif on textured white grid weave and gold EA embroidery.',
    description:
      'Signature Rust Floral Regular Fit Shirt — bold abstract botanical print in terracotta on a subtle white grid weave. Gold EA embroidery, regular fit (size 16 | S), premium hangtag presentation. Versatile for smart-casual and elevated weekends.',
    tags: ['rust', 'floral', 'regular-fit', 'embroidery', 'premium'],
    seoTitle: 'Signature Rust Floral Regular Fit Shirt | Elevate Apparel',
    seoDescription:
      'Shop Elevate Apparel signature rust floral regular-fit shirt with gold EA embroidery.',
    // Zero opening stock for out-of-stock catalog filter / CI coverage.
    variants: variantsFor('p11', shirtSizes, [{ name: 'Rust Floral', hex: '#a85a3c' }], 0),
    inStock: false,
    rating: 4.7,
    reviewCount: 24,
    reviews: [],
    isNew: true,
  },
  {
    id: 'p12',
    name: 'Dusty Blue Windowpane Check Shirt',
    slug: 'dusty-blue-windowpane-check-shirt',
    price: 2790,
    compareAtPrice: 3390,
    category: 'Shirts',
    subcategory: 'Casual Button-Downs',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Dusty Blue',
    colors: [
      { name: 'Dusty Blue', hex: '#7a9bb0' },
      { name: 'Slate Blue', hex: '#6a8499' },
    ],
    sizes: shirtSizes,
    image: IMG.dustyBlue,
    images: [IMG.dustyBlue, IMG.slateBlue, IMG.whitePeachWindowpane],
    imageAlts: [
      'Man modeling dusty blue long-sleeve shirt with grey windowpane check pattern',
      'Man in slate blue navy windowpane check shirt with indigo denim',
      'Man in white peach windowpane check casual shirt',
    ],
    shortDescription:
      'Dusty blue windowpane check with fine double-line grid — tailored cotton-blend casual shirt.',
    description:
      'Dusty Blue Windowpane Check Shirt — soft blue base with delicate grey/white double-line windowpane. Textured cotton-blend, pointed collar, blending chest pocket. Office-to-weekend versatility at a sharper sale price.',
    tags: ['blue', 'windowpane', 'casual', 'sale', 'cotton-blend'],
    seoTitle: 'Dusty Blue Windowpane Check Shirt | Elevate Apparel',
    seoDescription:
      'Shop Elevate Apparel dusty blue windowpane check shirt — breathable tailored casual button-down.',
    variants: variantsFor(
      'p12',
      shirtSizes,
      [
        { name: 'Dusty Blue', hex: '#7a9bb0' },
        { name: 'Slate Blue', hex: '#6a8499' },
      ],
      15,
    ),
    inStock: true,
    rating: 4.5,
    reviewCount: 31,
    reviews: [],
    onSale: true,
  },
  {
    id: 'p13',
    name: 'Slate Blue Windowpane Check Shirt',
    slug: 'slate-blue-windowpane-check-shirt',
    price: 2890,
    category: 'Shirts',
    subcategory: 'Casual Button-Downs',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Slate Blue',
    colors: [{ name: 'Slate Blue', hex: '#5a7a94' }],
    sizes: shirtSizes,
    image: IMG.slateBlue,
    images: [IMG.slateBlue, IMG.dustyBlue, IMG.blueEssentialsStack],
    imageAlts: [
      'Man wearing slate blue shirt with navy windowpane grid pattern and dark denim',
      'Man in dusty blue windowpane check casual shirt',
      'Stack of Elevate blue essentials dress shirts',
    ],
    shortDescription:
      'Muted slate blue windowpane grid shirt with tailored fit and textured cotton weave.',
    description:
      'Slate Blue Windowpane Check Shirt — denim-blue base with large navy windowpane grid. Fine textured weave, matching blue buttons, discreet chest pocket. A classic smart-casual staple.',
    tags: ['slate-blue', 'windowpane', 'smart-casual', 'cotton'],
    seoTitle: 'Slate Blue Windowpane Check Shirt | Elevate Apparel',
    seoDescription:
      'Shop Elevate Apparel slate blue windowpane check long-sleeve shirt — tailored smart-casual fit.',
    variants: variantsFor('p13', shirtSizes, [{ name: 'Slate Blue', hex: '#5a7a94' }], 14),
    inStock: true,
    rating: 4.6,
    reviewCount: 22,
    reviews: [],
    isNew: true,
  },
  {
    id: 'p14',
    name: 'Ubaid Classic Pebbled Leather Bi-fold Wallet',
    slug: 'ubaid-classic-pebbled-leather-wallet',
    price: 2490,
    compareAtPrice: 2990,
    category: 'Accessories',
    subcategory: 'Wallets',
    brand: 'Ubaid',
    collection: 'men',
    color: 'Dark Brown',
    colors: [{ name: 'Dark Brown', hex: '#3d2a1f' }],
    sizes: walletSizes,
    image: IMG.ubaidWallet,
    images: [IMG.ubaidWallet, IMG.ubaidWalletDetail],
    imageAlts: [
      'Ubaid dark brown pebbled leather bi-fold wallet upright on black pedestal',
      'Ubaid wallet outside and inside views with card slots, ID window, and zippered coin pocket',
    ],
    shortDescription:
      'Dark brown pebbled genuine leather bi-fold with card slots, ID window, and zippered coin pocket.',
    description:
      'Ubaid Classic Pebbled Genuine Leather Bi-fold Wallet — rich chocolate leather with shrunken-grain texture and embossed branding. Interior: mesh ID window, tiered card slots, zippered coin pocket, and bill compartment with black lining. Everyday carry refined.',
    tags: ['leather', 'bi-fold', 'wallet', 'genuine-leather', 'ubaid', 'accessory'],
    seoTitle: 'Ubaid Classic Pebbled Leather Bi-fold Wallet | Elevate Apparel',
    seoDescription:
      'Shop the Ubaid dark brown pebbled genuine leather bi-fold wallet — card slots, ID window, coin zip.',
    variants: variantsFor('p14', walletSizes, [{ name: 'Dark Brown', hex: '#3d2a1f' }], 40),
    inStock: true,
    rating: 4.9,
    reviewCount: 57,
    reviews: [
      {
        id: 'r8',
        author: 'Sakib R.',
        rating: 5,
        title: 'Solid leather',
        body: 'Grain feels premium and the layout holds cards without bulk. Worth it.',
        createdAt: '2026-06-20',
        verified: true,
      },
    ],
    isNew: true,
    onSale: true,
  },
  {
    id: 'p15',
    name: 'Elevate Blue Essentials Dress Shirt',
    slug: 'elevate-blue-essentials-dress-shirt',
    price: 2990,
    category: 'Shirts',
    subcategory: 'Dress Shirts',
    brand: 'Elevate Apparel',
    collection: 'men',
    color: 'Light Blue Gingham',
    colors: [
      { name: 'Light Blue Gingham', hex: '#a8c4e0' },
      { name: 'Navy Stripe', hex: '#1e3a5f' },
      { name: 'Sky Blue', hex: '#7eb8d9' },
    ],
    sizes: shirtSizes,
    image: IMG.blueEssentialsStack,
    images: [IMG.blueEssentialsStack, IMG.blueDressStack, IMG.blueCircle],
    imageAlts: [
      'Stack of Elevate premium blue dress shirts in gingham, navy stripe, and solid sky blue',
      'Five Elevate blue dress shirts stacked with brand hangtag and packaging band',
      'Elevate blue circle pattern dress shirt folded presentation',
    ],
    shortDescription:
      'Light blue gingham dress shirt from the Elevate Blue Essentials edit — office-ready cotton.',
    description:
      'Elevate Blue Essentials Dress Shirt leads with classic light blue gingham — also available in navy pinstripe and solid sky blue textured oxford. Pointed collar, white buttons, premium EA hangtag. Core rotation for professional wardrobes.',
    tags: ['gingham', 'blue', 'dress-shirt', 'bestseller', 'office'],
    seoTitle: 'Elevate Blue Essentials Dress Shirt | Elevate Apparel',
    seoDescription:
      'Shop Elevate Apparel blue essentials dress shirt — light blue gingham, navy stripe, and sky blue options.',
    variants: variantsFor(
      'p15',
      shirtSizes,
      [
        { name: 'Light Blue Gingham', hex: '#a8c4e0' },
        { name: 'Navy Stripe', hex: '#1e3a5f' },
        { name: 'Sky Blue', hex: '#7eb8d9' },
      ],
      20,
    ),
    inStock: true,
    rating: 4.8,
    reviewCount: 71,
    reviews: [],
  },
  {
    id: 'p16',
    name: 'Blush Peach Windowpane Soft Shirt',
    slug: 'blush-peach-windowpane-soft-shirt',
    price: 2890,
    compareAtPrice: 3490,
    category: 'Shirts',
    subcategory: 'Casual Button-Downs',
    brand: 'Elevate Apparel',
    collection: 'women',
    color: 'Blush Peach',
    colors: [
      { name: 'Blush Peach', hex: '#e8b4a0' },
      { name: 'Ivory Grid', hex: '#f5f0e8' },
    ],
    sizes: shirtSizes,
    image: IMG.whitePeachWindowpane,
    images: [IMG.whitePeachWindowpane, IMG.peachPlaid, IMG.terracottaFloral],
    imageAlts: [
      'Elevate blush peach and white windowpane check soft shirt',
      'Peach and white plaid button-down studio presentation',
      'Terracotta floral print shirt lifestyle detail',
    ],
    shortDescription:
      'Airy blush peach windowpane shirt with a soft drape — tailored for everyday polish.',
    description:
      'Blush Peach Windowpane Soft Shirt pairs a light peach-and-ivory grid with breathable cotton. Relaxed-tailored silhouette, pearlescent buttons, and a clean pointed collar for work-to-weekend ease in the women’s edit.',
    tags: ['women', 'windowpane', 'peach', 'soft-shirt', 'casual', 'new'],
    seoTitle: 'Blush Peach Windowpane Soft Shirt | Elevate Apparel',
    seoDescription:
      'Shop the Elevate Apparel blush peach windowpane soft shirt — women’s casual button-down.',
    variants: variantsFor(
      'p16',
      shirtSizes,
      [
        { name: 'Blush Peach', hex: '#e8b4a0' },
        { name: 'Ivory Grid', hex: '#f5f0e8' },
      ],
      16,
    ),
    inStock: true,
    rating: 4.7,
    reviewCount: 19,
    reviews: [
      {
        id: 'r16',
        author: 'Farhana A.',
        rating: 5,
        title: 'Soft and flattering',
        body: 'The peach tone is prettier in person. Light fabric, true to size.',
        createdAt: '2026-06-08',
        verified: true,
      },
    ],
    isNew: true,
    onSale: true,
  },
  {
    id: 'p17',
    name: 'Terracotta Bloom Slim Shirt',
    slug: 'terracotta-bloom-slim-shirt',
    price: 3190,
    category: 'Shirts',
    subcategory: 'Printed Shirts',
    brand: 'Elevate Apparel',
    collection: 'women',
    color: 'Terracotta Floral',
    colors: [{ name: 'Terracotta Floral', hex: '#c4785a' }],
    sizes: shirtSizes,
    image: IMG.terracottaFloral,
    images: [IMG.terracottaFloral, IMG.rustFloral, IMG.orangePlaid],
    imageAlts: [
      'Elevate terracotta floral slim-fit shirt studio portrait',
      'Rust floral regular-fit shirt folded presentation',
      'Orange plaid premium cotton shirt folded',
    ],
    shortDescription:
      'Slim floral shirt in warm terracotta blooms — statement print with everyday comfort.',
    description:
      'Terracotta Bloom Slim Shirt features painterly botanical motifs on a soft cotton base. Slim through the body with easy stretch at the yoke — a women’s capsule favorite for brunches and creative offices.',
    tags: ['women', 'floral', 'terracotta', 'slim-fit', 'print'],
    seoTitle: 'Terracotta Bloom Slim Shirt | Elevate Apparel',
    seoDescription:
      'Shop Elevate Apparel terracotta bloom slim shirt — women’s floral printed button-down.',
    variants: variantsFor('p17', shirtSizes, [{ name: 'Terracotta Floral', hex: '#c4785a' }], 14),
    inStock: true,
    rating: 4.8,
    reviewCount: 27,
    reviews: [],
    isNew: true,
  },
  {
    id: 'p18',
    name: 'Soft Peach Plaid Everyday Shirt',
    slug: 'soft-peach-plaid-everyday-shirt',
    price: 2690,
    category: 'Shirts',
    subcategory: 'Casual Button-Downs',
    brand: 'Elevate Apparel',
    collection: 'women',
    color: 'Peach Plaid',
    colors: [
      { name: 'Peach Plaid', hex: '#e0a090' },
      { name: 'Sand Plaid', hex: '#d4c4b0' },
    ],
    sizes: shirtSizes,
    image: IMG.peachPlaid,
    images: [IMG.peachPlaid, IMG.whitePeachWindowpane, IMG.orangePlaid],
    imageAlts: [
      'Elevate soft peach plaid everyday shirt studio shot',
      'Blush peach windowpane check shirt detail',
      'Orange plaid cotton shirt folded',
    ],
    shortDescription: 'Soft peach plaid button-down with a relaxed women’s fit for all-day wear.',
    description:
      'Soft Peach Plaid Everyday Shirt — warm peach and cream checks on breathable cotton. Slightly relaxed shoulders and a clean hem make it effortless with denim or tailored trousers.',
    tags: ['women', 'plaid', 'peach', 'everyday', 'casual'],
    seoTitle: 'Soft Peach Plaid Everyday Shirt | Elevate Apparel',
    seoDescription:
      'Shop Elevate Apparel soft peach plaid everyday shirt — women’s casual button-down.',
    variants: variantsFor(
      'p18',
      shirtSizes,
      [
        { name: 'Peach Plaid', hex: '#e0a090' },
        { name: 'Sand Plaid', hex: '#d4c4b0' },
      ],
      18,
    ),
    inStock: true,
    rating: 4.6,
    reviewCount: 14,
    reviews: [],
  },
  {
    id: 'p19',
    name: 'Rust Botanical Linen-Blend Shirt',
    slug: 'rust-botanical-linen-blend-shirt',
    price: 3390,
    compareAtPrice: 3990,
    category: 'Shirts',
    subcategory: 'Printed Shirts',
    brand: 'Elevate Apparel',
    collection: 'women',
    color: 'Rust Floral',
    colors: [{ name: 'Rust Floral', hex: '#a85a3c' }],
    sizes: shirtSizes,
    image: IMG.rustFloral,
    images: [IMG.rustFloral, IMG.terracottaFloral, IMG.patternedStack],
    imageAlts: [
      'Elevate rust botanical linen-blend shirt folded with accessories',
      'Terracotta floral slim shirt studio look',
      'Stack of Elevate patterned shirts',
    ],
    shortDescription:
      'Rust botanical print on a linen-blend weave — breezy women’s statement shirt.',
    description:
      'Rust Botanical Linen-Blend Shirt combines a textured ivory grid with rust botanical motifs and subtle gold EA embroidery. Lightweight linen-cotton blend for warm-weather layering in the women’s collection.',
    tags: ['women', 'botanical', 'linen-blend', 'rust', 'sale'],
    seoTitle: 'Rust Botanical Linen-Blend Shirt | Elevate Apparel',
    seoDescription:
      'Shop Elevate Apparel rust botanical linen-blend shirt — women’s printed summer button-down.',
    variants: variantsFor('p19', shirtSizes, [{ name: 'Rust Floral', hex: '#a85a3c' }], 12),
    inStock: true,
    rating: 4.9,
    reviewCount: 31,
    reviews: [],
    isNew: true,
    onSale: true,
  },
  {
    id: 'p20',
    name: 'Kids Bright Circle Pattern Shirt',
    slug: 'kids-bright-circle-pattern-shirt',
    price: 1890,
    category: 'Shirts',
    subcategory: 'Printed Shirts',
    brand: 'Elevate Apparel',
    collection: 'kids',
    color: 'Blue Circle',
    colors: [
      { name: 'Blue Circle', hex: '#4a7fb5' },
      { name: 'Sky Dot', hex: '#7eb8d9' },
    ],
    sizes: kidsSizes,
    image: IMG.blueCircle,
    images: [IMG.blueCircle, IMG.lightBluePatchwork, IMG.blueEssentialsStack],
    imageAlts: [
      'Elevate kids blue circle pattern shirt folded',
      'Light blue patchwork kids-friendly print shirt',
      'Stack of Elevate blue shirts',
    ],
    shortDescription:
      'Playful blue circle print shirt sized for kids — soft cotton, easy everyday wear.',
    description:
      'Kids Bright Circle Pattern Shirt brings graphic blue circles on soft cotton. Easy-care fabric, durable buttons, and a comfortable regular kids fit for school and weekends.',
    tags: ['kids', 'print', 'blue', 'cotton', 'new'],
    seoTitle: 'Kids Bright Circle Pattern Shirt | Elevate Apparel',
    seoDescription:
      'Shop Elevate Apparel kids bright circle pattern shirt — soft cotton play-ready button-down.',
    variants: variantsFor(
      'p20',
      kidsSizes,
      [
        { name: 'Blue Circle', hex: '#4a7fb5' },
        { name: 'Sky Dot', hex: '#7eb8d9' },
      ],
      20,
    ),
    inStock: true,
    rating: 4.7,
    reviewCount: 11,
    reviews: [
      {
        id: 'r20',
        author: 'Mitu R.',
        rating: 5,
        title: 'My son loves it',
        body: 'Soft, washes well, and the print still looks fresh after school days.',
        createdAt: '2026-05-28',
        verified: true,
      },
    ],
    isNew: true,
  },
  {
    id: 'p21',
    name: 'Kids Light Blue Patchwork Shirt',
    slug: 'kids-light-blue-patchwork-shirt',
    price: 1790,
    compareAtPrice: 2190,
    category: 'Shirts',
    subcategory: 'Casual Button-Downs',
    brand: 'Elevate Apparel',
    collection: 'kids',
    color: 'Light Blue Patchwork',
    colors: [{ name: 'Light Blue Patchwork', hex: '#9ec0de' }],
    sizes: kidsSizes,
    image: IMG.lightBluePatchwork,
    images: [IMG.lightBluePatchwork, IMG.blueCircle, IMG.dustyBlue],
    imageAlts: [
      'Elevate kids light blue patchwork shirt folded',
      'Blue circle pattern kids shirt',
      'Dusty blue windowpane shirt detail',
    ],
    shortDescription: 'Light blue patchwork kids shirt — soft panels and a durable everyday fit.',
    description:
      'Kids Light Blue Patchwork Shirt mixes soft blue panels for a modern casual look. Breathable cotton, reinforced seams, and kids sizes from 4Y to 12Y.',
    tags: ['kids', 'patchwork', 'light-blue', 'casual', 'sale'],
    seoTitle: 'Kids Light Blue Patchwork Shirt | Elevate Apparel',
    seoDescription:
      'Shop Elevate Apparel kids light blue patchwork shirt — soft cotton casual button-down.',
    variants: variantsFor('p21', kidsSizes, [{ name: 'Light Blue Patchwork', hex: '#9ec0de' }], 22),
    inStock: true,
    rating: 4.5,
    reviewCount: 8,
    reviews: [],
    onSale: true,
  },
  {
    id: 'p22',
    name: 'Kids Orange Plaid Adventure Shirt',
    slug: 'kids-orange-plaid-adventure-shirt',
    price: 1990,
    category: 'Shirts',
    subcategory: 'Casual Button-Downs',
    brand: 'Elevate Apparel',
    collection: 'kids',
    color: 'Orange Plaid',
    colors: [
      { name: 'Orange Plaid', hex: '#d4783c' },
      { name: 'Warm Check', hex: '#c46840' },
    ],
    sizes: kidsSizes,
    image: IMG.orangePlaid,
    images: [IMG.orangePlaid, IMG.peachPlaid, IMG.patternedStack],
    imageAlts: [
      'Elevate kids orange plaid adventure shirt folded',
      'Peach plaid shirt colorway reference',
      'Patterned Elevate shirt stack',
    ],
    shortDescription:
      'Bold orange plaid kids shirt for weekend adventures — sturdy cotton, easy care.',
    description:
      'Kids Orange Plaid Adventure Shirt — energetic orange and cream checks on durable cotton. Regular kids fit with room to move for playdates and family outings.',
    tags: ['kids', 'plaid', 'orange', 'casual', 'new'],
    seoTitle: 'Kids Orange Plaid Adventure Shirt | Elevate Apparel',
    seoDescription:
      'Shop Elevate Apparel kids orange plaid adventure shirt — bold check casual button-down.',
    variants: variantsFor(
      'p22',
      kidsSizes,
      [
        { name: 'Orange Plaid', hex: '#d4783c' },
        { name: 'Warm Check', hex: '#c46840' },
      ],
      18,
    ),
    inStock: true,
    rating: 4.6,
    reviewCount: 9,
    reviews: [],
    isNew: true,
  },
  {
    id: 'p23',
    name: 'Ubaid Slim Card Holder',
    slug: 'ubaid-slim-card-holder',
    price: 1490,
    compareAtPrice: 1790,
    category: 'Accessories',
    subcategory: 'Wallets',
    brand: 'Ubaid',
    collection: 'unisex',
    color: 'Dark Brown',
    colors: [
      { name: 'Dark Brown', hex: '#3d2a1f' },
      { name: 'Espresso', hex: '#2a1c14' },
    ],
    sizes: walletSizes,
    image: IMG.ubaidWalletDetail,
    images: [IMG.ubaidWalletDetail, IMG.ubaidWallet],
    imageAlts: [
      'Ubaid slim pebbled leather card holder open view with card slots',
      'Ubaid dark brown leather wallet family on pedestal',
    ],
    shortDescription: 'Minimal pebbled leather card holder — four slots and a central cash sleeve.',
    description:
      'Ubaid Slim Card Holder in dark brown pebbled genuine leather. Four card slots plus a slim cash sleeve — pocket-friendly finishing piece for the Elevate accessories edit.',
    tags: ['accessory', 'leather', 'card-holder', 'ubaid', 'unisex', 'sale'],
    seoTitle: 'Ubaid Slim Card Holder | Elevate Apparel',
    seoDescription:
      'Shop the Ubaid slim pebbled leather card holder — dark brown everyday accessory.',
    variants: variantsFor(
      'p23',
      walletSizes,
      [
        { name: 'Dark Brown', hex: '#3d2a1f' },
        { name: 'Espresso', hex: '#2a1c14' },
      ],
      35,
    ),
    inStock: true,
    rating: 4.8,
    reviewCount: 24,
    reviews: [],
    isNew: true,
    onSale: true,
  },
  {
    id: 'p24',
    name: 'Ubaid Travel Fold Wallet',
    slug: 'ubaid-travel-fold-wallet',
    price: 2790,
    category: 'Accessories',
    subcategory: 'Wallets',
    brand: 'Ubaid',
    collection: 'unisex',
    color: 'Dark Brown',
    colors: [{ name: 'Dark Brown', hex: '#3d2a1f' }],
    sizes: walletSizes,
    image: IMG.ubaidWallet,
    images: [IMG.ubaidWallet, IMG.ubaidWalletDetail],
    imageAlts: [
      'Ubaid dark brown travel fold leather wallet on pedestal',
      'Ubaid wallet interior with card slots and zip pocket',
    ],
    shortDescription: 'Travel-ready bi-fold with extra card capacity and a secure zip coin pocket.',
    description:
      'Ubaid Travel Fold Wallet expands the classic bi-fold with additional card tiers, ID window, and zippered coin pocket in rich chocolate pebbled leather — built for weekends away.',
    tags: ['accessory', 'leather', 'travel', 'wallet', 'ubaid', 'unisex'],
    seoTitle: 'Ubaid Travel Fold Wallet | Elevate Apparel',
    seoDescription:
      'Shop the Ubaid travel fold pebbled leather wallet — spacious everyday and travel carry.',
    variants: variantsFor('p24', walletSizes, [{ name: 'Dark Brown', hex: '#3d2a1f' }], 28),
    inStock: true,
    rating: 4.7,
    reviewCount: 16,
    reviews: [],
    isNew: true,
  },
  {
    id: 'p25',
    name: 'Elevate Signature Leather Key Case',
    slug: 'elevate-signature-leather-key-case',
    price: 990,
    compareAtPrice: 1290,
    category: 'Accessories',
    subcategory: 'Small Leather Goods',
    brand: 'Elevate Apparel',
    collection: 'unisex',
    color: 'Dark Brown',
    colors: [
      { name: 'Dark Brown', hex: '#3d2a1f' },
      { name: 'Black', hex: '#111111' },
    ],
    sizes: walletSizes,
    image: IMG.ubaidWalletDetail,
    images: [IMG.ubaidWalletDetail],
    imageAlts: ['Elevate signature dark brown leather key case with embossed branding detail'],
    shortDescription:
      'Compact leather key case with snap closure — quiet finishing touch for everyday carry.',
    description:
      'Elevate Signature Leather Key Case in pebbled dark brown (also available in black). Holds keys without bulk and pairs with Ubaid wallets in the accessories collection.',
    tags: ['accessory', 'leather', 'key-case', 'small-leather-goods', 'unisex', 'sale'],
    seoTitle: 'Elevate Signature Leather Key Case | Elevate Apparel',
    seoDescription:
      'Shop the Elevate signature leather key case — compact dark brown everyday accessory.',
    variants: variantsFor(
      'p25',
      walletSizes,
      [
        { name: 'Dark Brown', hex: '#3d2a1f' },
        { name: 'Black', hex: '#111111' },
      ],
      40,
    ),
    inStock: true,
    rating: 4.5,
    reviewCount: 12,
    reviews: [],
    onSale: true,
  },
];

export function getAllProducts(): CatalogProduct[] {
  return catalogProducts;
}

export function getProductsByCollection(collection: 'men' | 'women' | 'kids'): CatalogProduct[] {
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
      [p.name, p.category, p.subcategory, p.brand, p.color, ...(p.tags ?? [])]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
    .slice(0, limit);
}

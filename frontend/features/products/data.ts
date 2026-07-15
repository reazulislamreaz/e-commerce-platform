import type { CatalogProduct, HomeCategory, HomeSection } from './types';

// Placeholder catalog used by the homepage until the products API is implemented.
// imageHue drives a CSS gradient placeholder instead of remote images.

export const searchSuggestions = ['T-Shirt', 'Polo', 'Hoodie', 'Joggers', 'Kurti', 'Kids'];

export const navCategories = [
  { name: 'Men', slug: 'men' },
  { name: 'Women', slug: 'women' },
  { name: 'Kids', slug: 'kids' },
  { name: 'Teens', slug: 'teens' },
  { name: 'Sports', slug: 'sports' },
];

export const homeCategories: HomeCategory[] = [
  { id: 'c1', name: 'Half Sleeve T-Shirts', slug: 'half-sleeve-t-shirts', imageHue: 210 },
  { id: 'c2', name: 'Designer T-Shirts', slug: 'designer-t-shirts', imageHue: 340 },
  { id: 'c3', name: 'Sports T-Shirts', slug: 'sports-t-shirts', imageHue: 150 },
  { id: 'c4', name: 'Classic Polos', slug: 'classic-polos', imageHue: 230 },
  { id: 'c5', name: 'Printed Polos', slug: 'printed-polos', imageHue: 20 },
  { id: 'c6', name: 'Raglans', slug: 'raglans', imageHue: 260 },
  { id: 'c7', name: 'Football Jerseys', slug: 'football-jerseys', imageHue: 120 },
  { id: 'c8', name: 'Hoodies', slug: 'hoodies', imageHue: 280 },
  { id: 'c9', name: 'Jackets', slug: 'jackets', imageHue: 200 },
  { id: 'c10', name: 'Shorts', slug: 'shorts', imageHue: 45 },
  { id: 'c11', name: 'Trousers', slug: 'trousers', imageHue: 190 },
  { id: 'c12', name: 'Track Pants', slug: 'track-pants', imageHue: 300 },
  { id: 'c13', name: "Women's T-Shirts", slug: 'womens-t-shirts', imageHue: 330 },
  { id: 'c14', name: 'Kurti & Tops', slug: 'kurti-tops', imageHue: 10 },
  { id: 'c15', name: 'Kids Tees', slug: 'kids-tees', imageHue: 60 },
  { id: 'c16', name: 'Kids Polos', slug: 'kids-polos', imageHue: 170 },
  { id: 'c17', name: 'Panjabi', slug: 'panjabi', imageHue: 90 },
  { id: 'c18', name: 'Socks', slug: 'socks', imageHue: 250 },
] as const;

let productId = 0;
function product(
  name: string,
  category: string,
  price: number,
  compareAtPrice: number,
  imageHue: number,
): CatalogProduct {
  productId += 1;
  return {
    id: `p${productId}`,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    price,
    compareAtPrice,
    category,
    imageHue,
  };
}

export const homeSections: HomeSection[] = [
  {
    id: 'designer-polo',
    title: 'Designer Polo',
    viewMoreHref: '/category/printed-polos',
    products: [
      product('Premium Double PK Cotton Polo - Navy', 'Polo', 1090, 1290, 220),
      product('Premium Double PK Cotton Polo - Black', 'Polo', 1090, 1290, 0),
      product('Cut & Stitch Designer Polo - Maroon', 'Polo', 990, 1190, 350),
      product('Classic Pique Polo - Forest Green', 'Polo', 850, 990, 140),
      product('Contrast Collar Polo - White', 'Polo', 890, 1040, 200),
      product('Striped Designer Polo - Sky Blue', 'Polo', 940, 1140, 205),
      product('Textured Jacquard Polo - Charcoal', 'Polo', 1040, 1240, 240),
      product('Slim Fit Cotton Polo - Olive', 'Polo', 750, 900, 80),
    ],
  },
  {
    id: 'kurti-tops',
    title: 'Kurti, Tunic & Tops',
    viewMoreHref: '/category/kurti-tops',
    products: [
      product('Printed Cotton Kurti - Teal', 'Kurti', 950, 1190, 180),
      product('Embroidered Tunic - Dusty Rose', 'Kurti', 1190, 1490, 345),
      product('Floral Summer Top - Ivory', 'Tops', 850, 990, 50),
      product('A-Line Kurti - Midnight Blue', 'Kurti', 1090, 1390, 230),
      product('Block Print Kurti - Rust', 'Kurti', 990, 1240, 15),
      product('Casual Viscose Top - Sage', 'Tops', 890, 1090, 130),
      product('Layered Tunic - Mustard', 'Kurti', 1290, 1590, 45),
      product('Premium Designer Kurti - Wine', 'Kurti', 1690, 1990, 330),
    ],
  },
  {
    id: 'panjabi',
    title: 'Panjabi',
    viewMoreHref: '/category/panjabi',
    products: [
      product('Premium Cotton Panjabi - White', 'Panjabi', 1750, 2100, 40),
      product('Embroidered Panjabi - Black', 'Panjabi', 2450, 2890, 260),
      product('Silk Blend Panjabi - Cream', 'Panjabi', 3290, 3890, 55),
      product('Festive Panjabi - Deep Green', 'Panjabi', 2890, 3390, 145),
      product('Classic Panjabi - Sky', 'Panjabi', 1890, 2290, 210),
      product('Designer Panjabi - Maroon', 'Panjabi', 2690, 3190, 355),
      product('Luxury Jacquard Panjabi - Navy', 'Panjabi', 3790, 4390, 225),
      product('Everyday Cotton Panjabi - Grey', 'Panjabi', 1790, 2090, 0),
    ],
  },
  {
    id: 'denim',
    title: 'Denim Jeans',
    viewMoreHref: '/category/trousers',
    products: [
      product('Slim Fit Stretch Jeans - Indigo', 'Denim', 1790, 2150, 235),
      product('Regular Fit Jeans - Mid Blue', 'Denim', 1690, 1990, 215),
      product('Tapered Jeans - Jet Black', 'Denim', 1890, 2250, 250),
      product('Washed Denim - Light Blue', 'Denim', 1740, 2090, 205),
      product('Comfort Stretch Jeans - Grey', 'Denim', 1990, 2350, 220),
      product('Straight Cut Jeans - Dark Indigo', 'Denim', 1840, 2190, 240),
      product('Raw Denim - Deep Navy', 'Denim', 2090, 2350, 230),
      product('Slim Tapered Jeans - Ash', 'Denim', 1890, 2250, 210),
    ],
  },
  {
    id: 'kids-tees',
    title: 'Little Ones Tees',
    viewMoreHref: '/category/kids-tees',
    products: [
      product('Kids Graphic Tee - Sunshine', 'Kids', 435, 550, 55),
      product('Kids Dino Print Tee - Mint', 'Kids', 490, 590, 160),
      product('Kids Classic Polo - Red', 'Kids', 650, 790, 5),
      product('Kids Space Print Tee - Navy', 'Kids', 520, 640, 235),
      product('Kids Stripe Tee - Coral', 'Kids', 470, 570, 15),
      product('Kids Everyday Tee - White', 'Kids', 440, 540, 100),
      product('Kids Cartoon Tee - Lavender', 'Kids', 560, 690, 275),
      product('Kids Sporty Tee - Lime', 'Kids', 510, 620, 95),
    ],
  },
  {
    id: 'sports',
    title: 'Sports T-Shirts',
    viewMoreHref: '/category/sports-t-shirts',
    products: [
      product('Active Dry-Fit Tee - Electric Blue', 'Sports', 650, 790, 215),
      product('Training Tee - Graphite', 'Sports', 590, 720, 245),
      product('Football Jersey 2026 - Home', 'Sports', 1090, 1290, 195),
      product('Football Jersey 2026 - Away', 'Sports', 1090, 1290, 45),
      product('Running Tee - Neon Green', 'Sports', 620, 750, 110),
      product('Gym Stringer - Black', 'Sports', 550, 680, 260),
      product('Breathable Mesh Tee - Royal', 'Sports', 690, 840, 225),
      product('Fan Edition Jersey - Classic', 'Sports', 1290, 1490, 355),
    ],
  },
  {
    id: 'socks',
    title: 'Socks',
    viewMoreHref: '/category/socks',
    products: [
      product('Antibacterial Crew Socks - Black', 'Socks', 160, 220, 250),
      product('Antibacterial Crew Socks - White', 'Socks', 160, 220, 60),
      product('Ankle Socks 3-Pack - Mixed', 'Socks', 220, 300, 180),
      product('Cushioned Sports Socks - Grey', 'Socks', 190, 260, 210),
      product('No-Show Socks - Beige', 'Socks', 170, 230, 35),
      product('Ribbed Formal Socks - Navy', 'Socks', 180, 240, 230),
      product('Breathable Mesh Socks - Olive', 'Socks', 175, 235, 85),
      product('Everyday Socks 2-Pack - Assorted', 'Socks', 200, 270, 300),
    ],
  },
  {
    id: 'womens-designer',
    title: "Women's Designer T-Shirts",
    viewMoreHref: '/category/womens-t-shirts',
    products: [
      product('Relaxed Fit Graphic Tee - Blush', 'Women', 590, 720, 340),
      product('Boxy Crop Tee - Butter', 'Women', 540, 660, 50),
      product('Minimal Logo Tee - White', 'Women', 490, 600, 70),
      product('Oversized Print Tee - Lilac', 'Women', 640, 780, 280),
      product('Classic Crew Tee - Rose', 'Women', 520, 630, 350),
      product('Statement Tee - Sage Green', 'Women', 610, 750, 135),
      product('Vintage Wash Tee - Slate', 'Women', 660, 800, 220),
      product('Soft Cotton Tee - Peach', 'Women', 550, 670, 25),
    ],
  },
];

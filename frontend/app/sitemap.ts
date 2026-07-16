import type { MetadataRoute } from 'next';
import { getAllProducts } from '@/features/products';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    '',
    '/shop',
    '/category/men',
    '/category/women',
    '/new-arrivals',
    '/sale',
    '/about',
    '/contact',
    '/store',
    '/faqs',
    '/shipping',
    '/returns',
    '/size-guide',
    '/terms',
    '/privacy',
    '/wishlist',
    '/track-order',
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.7,
  }));

  const products = getAllProducts().map((product) => ({
    url: `${siteUrl}/product/${product.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...products];
}

import type { MetadataRoute } from 'next';
import { productCatalog } from '@/features/products';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const SITEMAP_PAGE_SIZE = 100;

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    '',
    '/shop',
    '/category/men',
    '/category/women',
    '/category/kids',
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

  const products: MetadataRoute.Sitemap = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const result = await productCatalog.list({ page, pageSize: SITEMAP_PAGE_SIZE });
    totalPages = Math.max(1, result.totalPages);
    for (const product of result.items) {
      products.push({
        url: `${siteUrl}/product/${product.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
    page += 1;
  }

  return [...staticRoutes, ...products];
}

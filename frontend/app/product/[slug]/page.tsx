import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dehydrateProductDetail, getCachedProductBySlug } from '@/features/products';
import { ProductDetailClient } from '@/components/product/product-detail-client';
import { QueryHydration } from '@/providers/query-hydration';

export const revalidate = 60;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCachedProductBySlug(slug);
  if (!product) return { title: 'Product' };
  const imageUrl = product.image.startsWith('http')
    ? product.image
    : `${siteUrl}${product.image}`;
  return {
    title: product.name,
    description: `${product.name} — ${product.color}. Premium Elevate Apparel.`,
    openGraph: {
      title: product.name,
      description: `${product.name} — ${product.color}. Premium Elevate Apparel.`,
      images: [{ url: imageUrl, alt: product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      images: [imageUrl],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const { state, product } = await dehydrateProductDetail(slug);
  if (!product) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image.startsWith('http') ? product.image : `${siteUrl}${product.image}`,
    sku: product.variants?.[0]?.sku,
    brand: { '@type': 'Brand', name: product.brand },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BDT',
      price: product.price,
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${siteUrl}/product/${product.slug}`,
    },
    ...(product.reviewCount && product.reviewCount > 0 && product.rating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };

  return (
    <QueryHydration state={state}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient product={product} />
    </QueryHydration>
  );
}

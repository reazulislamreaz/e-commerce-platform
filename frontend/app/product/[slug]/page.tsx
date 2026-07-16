import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getProductBySlug,
  getAllProducts,
  getRelatedProducts,
} from '@/features/products/data';
import { ProductDetailClient } from '@/components/product/product-detail-client';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: 'Product' };
  return {
    title: product.name,
    description: `${product.name} — ${product.color}. Elevate Apparel.`,
  };
}

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ slug: p.slug }));
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  return <ProductDetailClient product={product} related={getRelatedProducts(product)} />;
}

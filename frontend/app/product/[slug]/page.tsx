import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Heart } from 'lucide-react';
import { formatTaka } from '@/lib/currency';
import { getProductBySlug, getAllProducts } from '@/features/products/data';
import { ProductCard } from '@/components/shared/product-card';

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

  const related = getAllProducts()
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const discount =
    product.compareAtPrice && product.onSale
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0;

  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 sm:px-7 lg:grid-cols-2 lg:gap-12 lg:py-12">
        <div className="relative overflow-hidden rounded-[4px] bg-[#e4e3e1]">
          <Image
            src={product.image}
            alt={product.name}
            width={800}
            height={1000}
            priority
            className="aspect-[.8] h-auto w-full object-cover"
          />
          {discount > 0 && (
            <span className="absolute left-3 top-3 bg-[#e5bd79] px-2.5 py-1 text-[11px] font-bold text-[#18120b]">
              -{discount}%
            </span>
          )}
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
            {product.category}
          </p>
          <h1 className="mt-2 text-[clamp(28px,5vw,42px)] font-extrabold tracking-[-.03em] text-white">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-[#b5b0a8]">{product.color}</p>
          <p className="mt-4 flex items-baseline gap-3 text-xl font-semibold text-[#e5c17d]">
            {formatTaka(product.price)}
            {product.compareAtPrice && product.onSale && (
              <span className="text-sm font-normal text-[#8b867d] line-through">
                {formatTaka(product.compareAtPrice)}
              </span>
            )}
          </p>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-[#eee9e1]">
            Premium Elevate construction — soft hand-feel, clean silhouette, made to elevate your
            everyday rotation.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <button
              type="button"
              className="border border-[#efc677] bg-[#e5bd79] px-6 py-3 text-[11px] font-bold uppercase text-[#18120b] hover:bg-[#eec98a]"
            >
              Add to Bag
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 border border-[#37332c] px-5 py-3 text-[11px] font-bold uppercase text-white hover:border-[#e3bb78] hover:text-[#e3bb78]"
            >
              <Heart className="size-3.5" strokeWidth={1.5} /> Wishlist
            </button>
          </div>
          <Link
            href="/shop"
            className="mt-6 text-[11px] font-semibold uppercase tracking-wide text-[#b5b0a8] hover:text-[#e3bb78]"
          >
            ← Back to shop
          </Link>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mx-auto max-w-[1400px] border-t border-[#2d2a27] px-3 py-8 sm:px-6 sm:py-10">
          <h2 className="mb-5 text-base font-bold uppercase tracking-tight text-white">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 gap-x-2.5 gap-y-6 min-[480px]:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

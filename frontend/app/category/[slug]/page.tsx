import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHero } from '@/components/shared/page-hero';
import { ShopCatalog } from '@/components/shop/shop-catalog';
import { getProductsByCollection } from '@/features/products/data';

const collections = {
  men: {
    eyebrow: "Men's Collection",
    title: "MEN'S\nEDIT",
    description:
      'Sharp silhouettes, heavyweight fabrics, and everyday essentials designed for presence.',
    image: '/images/home/collection-men.webp',
    cta: { href: '/shop', label: 'Shop All' },
    secondaryCta: { href: '/new-arrivals', label: 'New Drops' },
    variant: 'asymmetric' as const,
  },
  women: {
    eyebrow: "Women's Collection",
    title: "WOMEN'S\nEDIT",
    description:
      'Soft structure, refined neutrals, and pieces that move with you — elevated and effortless.',
    image: '/images/home/collection-women.webp',
    cta: { href: '/shop', label: 'Shop All' },
    secondaryCta: { href: '/sale', label: 'Sale' },
    variant: 'split' as const,
  },
} as const;

type CollectionKey = keyof typeof collections;

export function generateStaticParams() {
  return Object.keys(collections).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const key = slug as CollectionKey;
  if (!(key in collections)) return { title: 'Collection' };
  const label = key === 'men' ? "Men's" : "Women's";
  return {
    title: `${label} Collection`,
    description: `Shop Elevate Apparel ${label.toLowerCase()} collection.`,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const key = slug as CollectionKey;
  if (!(key in collections)) notFound();

  const meta = collections[key];
  const products = getProductsByCollection(key);

  return (
    <main id="main-content" className="flex-1 bg-black">
      <PageHero
        variant={meta.variant}
        eyebrow={meta.eyebrow}
        title={meta.title.split('\n').map((line, i) => (
          <span key={line}>
            {i > 0 && <br />}
            {i === 1 ? <span className="text-[#e3bb78]">{line}</span> : line}
          </span>
        ))}
        description={meta.description}
        image={meta.image}
        cta={meta.cta}
        secondaryCta={meta.secondaryCta}
      />
      <section className="mx-auto max-w-[1400px] px-3 py-8 sm:px-6 sm:py-10">
        <ShopCatalog
          products={products}
          title={key === 'men' ? "Men's Pieces" : "Women's Pieces"}
          initialFilters={{ collections: [key] }}
        />
      </section>
    </main>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Headphones,
  Heart,
  Quote,
  RefreshCw,
  ShieldCheck,
  Star,
  Truck,
} from 'lucide-react';
import { formatTaka } from '@/lib/currency';
import { getNewArrivals, getSaleProducts } from '@/features/products/data';
import type { CatalogProduct } from '@/features/products/types';
import { NewsletterForm } from '@/components/shared/newsletter-form';

const collections = [
  { title: "MEN'S\nCOLLECTION", href: '/category/men', image: 'collection-men.webp' },
  { title: "WOMEN'S\nCOLLECTION", href: '/category/women', image: 'collection-women.webp' },
  { title: 'NEW\nARRIVALS', href: '/new-arrivals', image: 'collection-new.webp' },
  { title: 'SALE\nUP TO 40% OFF', href: '/sale', image: 'collection-sale.webp' },
];

/** Featured edit — preserved homepage merchandising */
const featuredProducts: CatalogProduct[] = [
  {
    id: 'f1',
    name: 'Elevate Oversized Tee',
    slug: 'elevate-oversized-tee',
    price: 1190,
    category: 'T-Shirts',
    collection: 'men',
    color: 'Black',
    image: '/images/home/product-1.webp',
  },
  {
    id: 'f2',
    name: 'Essential Tee',
    slug: 'essential-tee',
    price: 1090,
    category: 'T-Shirts',
    collection: 'unisex',
    color: 'Off White',
    image: '/images/home/product-2.webp',
  },
  {
    id: 'f3',
    name: 'Elevate Hoodie',
    slug: 'elevate-hoodie',
    price: 1890,
    category: 'Hoodies',
    collection: 'men',
    color: 'Black',
    image: '/images/home/product-3.webp',
  },
  {
    id: 'f4',
    name: 'Minimal Tee',
    slug: 'minimal-tee',
    price: 1090,
    category: 'T-Shirts',
    collection: 'unisex',
    color: 'Beige',
    image: '/images/home/product-4.webp',
  },
  {
    id: 'f5',
    name: 'Elevate Jogger',
    slug: 'elevate-jogger',
    price: 1590,
    category: 'Bottoms',
    collection: 'men',
    color: 'Black',
    image: '/images/home/product-5.webp',
  },
  {
    id: 'f6',
    name: "Women's Hoodie",
    slug: 'womens-hoodie',
    price: 1890,
    category: 'Hoodies',
    collection: 'women',
    color: 'Cream',
    image: '/images/home/product-6.webp',
  },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold uppercase tracking-tight text-white sm:text-[17px]">
      {children}
    </h2>
  );
}

function SectionHeader({
  title,
  href,
  linkLabel = 'VIEW ALL',
}: {
  title: string;
  href: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <SectionTitle>{title}</SectionTitle>
      <Link href={href} className="flex shrink-0 items-center gap-2 text-[11px] font-medium text-white">
        {linkLabel} <ArrowRight className="size-4 text-[#dcb878]" />
      </Link>
    </div>
  );
}

function ProductRail({ products }: { products: CatalogProduct[] }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-5 min-[480px]:grid-cols-3 lg:grid-cols-6">
      {products.map((product) => (
        <Link key={product.id} href={`/product/${product.slug}`} className="group min-w-0">
          <div className="relative overflow-hidden rounded-[4px] bg-[#e4e3e1]">
            <Image
              src={product.image}
              alt={product.name}
              width={304}
              height={368}
              quality={85}
              sizes="(max-width: 480px) 50vw, (max-width: 1024px) 33vw, 16vw"
              className="aspect-[.826] h-auto w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {product.isNew && (
              <span className="absolute left-2 top-2 border border-[#e3bb78] bg-black/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#e3bb78]">
                New
              </span>
            )}
            {product.onSale && product.compareAtPrice && (
              <span className="absolute left-2 top-2 bg-[#e5bd79] px-1.5 py-0.5 text-[9px] font-bold text-[#18120b]">
                -
                {Math.round((1 - product.price / product.compareAtPrice) * 100)}%
              </span>
            )}
            <Heart
              className="absolute right-2 top-2 size-[17px] stroke-[#111]"
              strokeWidth={1.5}
            />
          </div>
          <p className="mt-2 truncate text-[11px] font-medium leading-4 text-white">{product.name}</p>
          <p className="text-[11px] leading-4 text-[#d0cbc4]">{product.color}</p>
          <p className="mt-1 flex items-baseline gap-2 text-[13px] font-semibold text-[#e5c17d]">
            {formatTaka(product.price)}
            {product.compareAtPrice && product.onSale && (
              <span className="text-[11px] font-normal text-[#8b867d] line-through">
                {formatTaka(product.compareAtPrice)}
              </span>
            )}
          </p>
        </Link>
      ))}
    </div>
  );
}

function Hero() {
  return (
    <section className="relative h-[80svh] min-h-[420px] overflow-hidden border-b border-[#2d2a27] bg-[#090909]">
      <div className="absolute inset-y-0 right-0 w-full sm:w-[62%]">
        <Image
          src="/images/home/hero.webp"
          alt="Model wearing Elevate black t-shirt"
          fill
          priority
          quality={85}
          sizes="(max-width: 640px) 100vw, 62vw"
          className="object-cover object-[68%_center] sm:object-center"
        />
      </div>
      <div className="absolute inset-0 bg-linear-to-r from-[#080808] via-[#080808]/90 to-[#080808]/20 sm:inset-y-0 sm:left-0 sm:w-[68%] sm:bg-linear-to-r sm:from-[#080808] sm:via-[#080808]/95 sm:to-transparent" />
      <ArrowLeft
        aria-hidden
        className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-white sm:left-7 sm:size-7"
      />
      <ArrowRight
        aria-hidden
        className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-white sm:right-6 sm:size-7"
      />
      <div className="relative mx-auto flex h-full max-w-[1400px] items-center px-12 sm:px-[10.2%]">
        <div className="max-w-[390px]">
          <p className="text-xs font-semibold uppercase tracking-[.11em] text-[#e0bd7d] sm:text-[14px]">
            Discover Your Edge
          </p>
          <h1 className="mt-2 text-[clamp(42px,12vw,64px)] font-extrabold leading-[.93] tracking-[-.055em] text-white">
            ELEVATE <span className="block text-[#e3bb78]">EVERYDAY</span>
          </h1>
          <p className="mt-3 max-w-[260px] text-sm font-medium leading-[1.5] text-[#f6f4f2]">
            Premium quality apparel designed to elevate your style.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5 sm:gap-3">
            <Link
              href="/shop"
              className="border border-[#efc677] bg-[#e5bd79] px-4 py-2.5 text-[11px] font-bold text-[#18120b] sm:px-5"
            >
              SHOP NOW
            </Link>
            <Link
              href="/new-arrivals"
              className="border border-[#cbc6bf] bg-black/10 px-4 py-2.5 text-[11px] font-bold text-white sm:px-5"
            >
              NEW ARRIVALS
            </Link>
          </div>
        </div>
      </div>
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-4">
        <span className="size-2.5 rounded-full bg-[#e6bf7f]" />
        <span className="size-2.5 rounded-full border border-white/70" />
        <span className="size-2.5 rounded-full border border-white/70" />
      </div>
    </section>
  );
}

function Benefits() {
  const benefits = [
    [Truck, 'FREE DELIVERY', 'On all orders over ৳1999'],
    [ShieldCheck, 'PREMIUM QUALITY', 'Finest materials'],
    [RefreshCw, 'EASY RETURNS', '7 day return policy'],
    [Headphones, 'CUSTOMER SUPPORT', "We're here to help"],
  ] as const;
  return (
    <section className="bg-[#111110]">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-y-3 px-5 py-4 min-[440px]:grid-cols-2 sm:px-7 lg:grid-cols-4 lg:gap-y-0">
        {benefits.map(([Icon, title, text], index) => (
          <div
            key={title}
            className={`flex items-center gap-3 px-2 sm:px-4 ${index ? 'lg:border-l lg:border-[#4b4741]' : ''}`}
          >
            <Icon className="size-8 shrink-0 text-[#e4bd7d]" strokeWidth={1.5} />
            <div>
              <p className="text-xs font-bold text-white">{title}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-[#eee9e1]">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CollectionGrid() {
  return (
    <section className="mx-auto max-w-[1400px] px-3 pt-3 sm:px-6">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {collections.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative aspect-[.9] overflow-hidden rounded-[5px] bg-[#222] sm:aspect-[1.05] lg:h-[325px] lg:aspect-auto"
          >
            <Image
              src={`/images/home/${item.image}`}
              alt=""
              fill
              quality={85}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 330px"
              className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/5" />
            <span className="absolute bottom-13 left-3 whitespace-pre-line text-[clamp(15px,4vw,20px)] font-bold leading-[1.05] text-white">
              {item.title}
            </span>
            <span className="absolute bottom-3 left-3 border border-white/70 px-2.5 py-1.5 text-[10px] font-bold text-white">
              SHOP NOW
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Featured() {
  return (
    <section className="mx-auto max-w-[1400px] px-3 pt-5 sm:px-6 sm:pt-4">
      <SectionHeader title="Featured Products" href="/shop" />
      <ProductRail products={featuredProducts} />
    </section>
  );
}

/** Fresh drops — drives discovery without replacing Featured */
function NewArrivals() {
  const products = getNewArrivals().slice(0, 6);
  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1400px] px-3 pt-8 sm:px-6">
      <SectionHeader title="New Arrivals" href="/new-arrivals" />
      <ProductRail products={products} />
    </section>
  );
}

/** Single purposeful promo — urgency without clutter */
function SalePromo() {
  const saleCount = getSaleProducts().length;

  return (
    <section className="mx-auto mt-8 max-w-[1400px] px-3 sm:px-6">
      <Link
        href="/sale"
        className="group relative flex min-h-[140px] items-center overflow-hidden rounded-[5px] bg-[#111110] sm:min-h-[160px]"
      >
        <Image
          src="/images/home/collection-sale.webp"
          alt=""
          fill
          quality={85}
          sizes="(max-width: 1400px) 100vw, 1400px"
          className="object-cover opacity-40 transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-r from-black via-black/80 to-black/30" />
        <div className="relative px-5 py-8 sm:px-10">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
            Limited Time
          </p>
          <p className="mt-1 text-[clamp(24px,5vw,36px)] font-extrabold tracking-[-.03em] text-white">
            SALE UP TO <span className="text-[#e3bb78]">40% OFF</span>
          </p>
          <p className="mt-1 text-xs text-[#eee9e1]">
            {saleCount} select pieces — while stocks last
          </p>
          <span className="mt-4 inline-flex items-center gap-2 border border-[#efc677] bg-[#e5bd79] px-4 py-2 text-[11px] font-bold text-[#18120b]">
            SHOP SALE <ArrowRight className="size-3.5" />
          </span>
        </div>
      </Link>
    </section>
  );
}

function About() {
  return (
    <section className="mx-auto mt-8 grid max-w-[1400px] grid-cols-1 bg-[#111110] lg:grid-cols-2">
      <div className="relative min-h-[205px] overflow-hidden px-5 py-6 sm:min-h-[190px] sm:px-7 lg:min-h-[168px] lg:py-5">
        <Image
          src="/images/home/about-models.webp"
          alt="Elevate Apparel models"
          fill
          quality={85}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover object-right"
        />
        <div className="absolute inset-y-0 left-0 w-[72%] bg-linear-to-r from-[#111110] via-[#111110]/95 to-transparent sm:w-[55%]" />
        <div className="relative max-w-[270px]">
          <h2 className="text-[16px] font-semibold uppercase text-[#dbb87c]">
            About Elevate Apparel
          </h2>
          <p className="mt-3 text-xs leading-[1.5] text-[#f3f1ef]">
            Elevate Apparel is more than just clothing. It&apos;s a mindset. We create premium
            quality, minimal and timeless pieces to elevate your everyday life.
          </p>
          <Link
            href="/about"
            className="mt-3 inline-block border border-[#d3b06f] px-4 py-2 text-[11px] font-bold text-[#efce91]"
          >
            LEARN MORE
          </Link>
        </div>
      </div>
      <div className="relative px-10 py-6 text-center sm:px-14 lg:px-12 lg:py-5">
        <h2 className="text-[16px] font-semibold uppercase text-[#dbb87c]">
          What Our Customers Say
        </h2>
        <Quote className="absolute left-4 top-[58px] size-5 fill-[#dfbd7f] text-[#dfbd7f] sm:left-9" />
        <ArrowLeft className="absolute left-3 top-1/2 size-5 text-white sm:left-8" />
        <ArrowRight className="absolute right-3 top-1/2 size-5 text-white sm:right-8" />
        <p className="mx-auto mt-4 max-w-[315px] text-xs leading-[1.5] text-[#f0edeb]">
          The quality is outstanding! Super comfortable and a perfect fit. Elevate is my go-to brand
          now.
        </p>
        <div className="mt-2 flex justify-center gap-1 text-[#e3bd79]">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className="size-3 fill-current" />
          ))}
        </div>
        <p className="mt-2 text-xs text-white">— Shakib H.</p>
      </div>
    </section>
  );
}

/** Email capture — high-converting fashion pattern, kept minimal */
function Newsletter() {
  return (
    <section className="mx-auto mt-8 max-w-[1400px] border border-[#2d2a27] bg-[#111110] px-5 py-10 text-center sm:px-10 sm:py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
        Stay Elevated
      </p>
      <h2 className="mt-2 text-[clamp(22px,4vw,28px)] font-extrabold tracking-[-.03em] text-white">
        NEW DROPS &amp; MEMBER OFFERS
      </h2>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#b5b0a8]">
        Be first to know about new arrivals, restocks, and exclusive offers. No spam — just the
        edit.
      </p>
      <NewsletterForm />
    </section>
  );
}

function Instagram() {
  return (
    <section className="mx-auto max-w-[1400px] bg-black px-3 pb-3 pt-8 text-center sm:px-7 sm:pb-2">
      <h2 className="text-[15px] font-semibold uppercase text-[#e3bf7f]">Follow Us on Instagram</h2>
      <p className="mt-0.5 text-xs text-white">@elevate.apparel</p>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {Array.from({ length: 8 }, (_, index) => (
          <a
            key={index}
            href="#"
            aria-label={`Instagram post ${index + 1}`}
            className="relative block aspect-[1.27] overflow-hidden"
          >
            <Image
              src={`/images/home/instagram-${index + 1}.webp`}
              alt=""
              fill
              quality={85}
              sizes="(max-width: 1024px) 25vw, 170px"
              className="object-cover"
            />
          </a>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main id="main-content" className="flex-1 bg-black">
      <Hero />
      <Benefits />
      <CollectionGrid />
      <Featured />
      <NewArrivals />
      <SalePromo />
      <About />
      <Newsletter />
      <Instagram />
    </main>
  );
}

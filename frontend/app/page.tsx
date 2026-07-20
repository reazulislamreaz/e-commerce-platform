import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Headphones,
  Quote,
  RefreshCw,
  ShieldCheck,
  Star,
  Truck,
} from 'lucide-react';
import { productCatalog } from '@/features/products';
import type { CatalogProduct } from '@/features/products/types';
import { marketingApi } from '@/features/marketing/api';
import { FALLBACK_BANNERS, pickPrimaryBanner } from '@/features/marketing/banners';
import type { MarketingBanner } from '@/features/marketing/types';
import { NewsletterForm } from '@/components/shared/newsletter-form';
import { ProductCard } from '@/components/shared/product-card';

// Rendered at request time: catalog data comes from the API, which is not
// reachable during `next build` (images are built without a live backend).
export const dynamic = 'force-dynamic';

const FALLBACK_HERO = FALLBACK_BANNERS.HOME_HERO;
const FALLBACK_PROMO = FALLBACK_BANNERS.HOME_PROMO;

const collections = [
  { title: "MEN'S\nCOLLECTION", href: '/category/men', image: 'collection-men.webp' },
  { title: "WOMEN'S\nCOLLECTION", href: '/category/women', image: 'collection-women.webp' },
  { title: 'NEW\nARRIVALS', href: '/new-arrivals', image: 'collection-new.webp' },
  { title: 'SALE\nUP TO 40% OFF', href: '/sale', image: 'collection-sale.webp' },
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
      <Link
        href={href}
        className="flex shrink-0 items-center gap-2 text-[11px] font-medium text-white"
      >
        {linkLabel} <ArrowRight className="size-4 text-[#dcb878]" />
      </Link>
    </div>
  );
}

function ProductRail({ products }: { products: CatalogProduct[] }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-5 min-[480px]:grid-cols-3 lg:grid-cols-6">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 2} />
      ))}
    </div>
  );
}

function Hero({ banner }: { banner: MarketingBanner }) {
  const titleParts = banner.title.trim().split(/\s+/);
  const lead = titleParts.slice(0, -1).join(' ') || banner.title;
  const accent = titleParts.length > 1 ? titleParts[titleParts.length - 1] : '';
  const desktopSrc = banner.imageUrl;
  const mobileSrc =
    banner.mobileImageUrl && banner.mobileImageUrl !== banner.imageUrl
      ? banner.mobileImageUrl
      : null;
  const ctaHref = banner.ctaHref?.trim() || '/shop';
  const ctaLabel = banner.ctaLabel?.trim() || 'SHOP NOW';

  return (
    <section className="relative h-[80svh] min-h-[420px] overflow-hidden border-b border-[#2d2a27] bg-[#090909]">
      <div className="absolute inset-y-0 right-0 w-full sm:w-[62%]">
        {mobileSrc ? (
          <>
            <Image
              src={mobileSrc}
              alt={banner.title}
              fill
              priority
              quality={85}
              sizes="100vw"
              className="object-cover object-[68%_center] md:hidden"
            />
            <Image
              src={desktopSrc}
              alt={banner.title}
              fill
              priority
              quality={85}
              sizes="62vw"
              className="hidden object-cover object-center md:block"
            />
          </>
        ) : (
          <Image
            src={desktopSrc}
            alt={banner.title}
            fill
            priority
            quality={85}
            sizes="(max-width: 640px) 100vw, 62vw"
            className="object-cover object-[68%_center] sm:object-center"
          />
        )}
      </div>
      <div className="absolute inset-0 bg-linear-to-r from-[#080808] via-[#080808]/90 to-[#080808]/20 sm:inset-y-0 sm:left-0 sm:w-[68%] sm:bg-linear-to-r sm:from-[#080808] sm:via-[#080808]/95 sm:to-transparent" />
      <div className="relative mx-auto flex h-full max-w-[1400px] items-center px-5 sm:px-[10.2%]">
        <div className="max-w-[390px]">
          <p className="text-xs font-semibold uppercase tracking-[.11em] text-[#e0bd7d] sm:text-[14px]">
            Discover Your Edge
          </p>
          <h1 className="mt-2 text-[clamp(42px,12vw,64px)] font-extrabold leading-[.93] tracking-[-.055em] text-white">
            {lead} {accent ? <span className="block text-[#e3bb78]">{accent}</span> : null}
          </h1>
          {banner.subtitle ? (
            <p className="mt-3 max-w-[260px] text-sm font-medium leading-[1.5] text-[#f6f4f2]">
              {banner.subtitle}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2.5 sm:gap-3">
            <Link
              href={ctaHref}
              className="border border-[#efc677] bg-[#e5bd79] px-4 py-2.5 text-[11px] font-bold text-[#18120b] sm:px-5"
            >
              {ctaLabel}
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
    [Truck, 'FAST DELIVERY', 'Reliable nationwide shipping'],
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

function HomePromo({ banner }: { banner: MarketingBanner }) {
  const ctaHref = banner.ctaHref?.trim() || '/new-arrivals';
  const ctaLabel = banner.ctaLabel?.trim() || 'SHOP NOW';
  const desktopSrc = banner.imageUrl;
  const mobileSrc =
    banner.mobileImageUrl && banner.mobileImageUrl !== banner.imageUrl
      ? banner.mobileImageUrl
      : null;

  return (
    <section className="border-y border-[#2d2a27] bg-[#090909]">
      <div className="relative mx-auto max-w-[1400px] overflow-hidden">
        <div className="relative min-h-[160px] sm:min-h-[180px]">
          {mobileSrc ? (
            <>
              <Image
                src={mobileSrc}
                alt=""
                fill
                quality={80}
                sizes="100vw"
                className="object-cover object-center opacity-50 md:hidden"
              />
              <Image
                src={desktopSrc}
                alt=""
                fill
                quality={80}
                sizes="100vw"
                className="hidden object-cover object-center opacity-50 md:block"
              />
            </>
          ) : (
            <Image
              src={desktopSrc}
              alt=""
              fill
              quality={80}
              sizes="100vw"
              className="object-cover object-center opacity-50"
            />
          )}
          <div className="absolute inset-0 bg-linear-to-r from-[#090909] via-[#090909]/85 to-[#090909]/40" />
          <div className="relative flex min-h-[160px] flex-col justify-center gap-3 px-5 py-8 sm:min-h-[180px] sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-10">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#e0bd7d]">
                Featured
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-[-.03em] text-white sm:text-3xl">
                {banner.title}
              </h2>
              {banner.subtitle ? (
                <p className="mt-1.5 text-sm text-[#eee9e1]">{banner.subtitle}</p>
              ) : null}
            </div>
            <Link
              href={ctaHref}
              className="inline-flex w-fit shrink-0 border border-[#efc677] bg-[#e5bd79] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#18120b] transition-colors hover:bg-[#eec98a]"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
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

function Featured({ products }: { products: CatalogProduct[] }) {
  return (
    <section className="mx-auto max-w-[1400px] px-3 pt-5 sm:px-6 sm:pt-4">
      <SectionHeader title="Featured Products" href="/shop" />
      <ProductRail products={products} />
    </section>
  );
}

/** Fresh drops — drives discovery without replacing Featured */
function NewArrivals({ products }: { products: CatalogProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1400px] px-3 pt-8 sm:px-6">
      <SectionHeader title="New Arrivals" href="/new-arrivals" />
      <ProductRail products={products} />
    </section>
  );
}

/** Single purposeful promo — urgency without clutter */
function SalePromo({ saleCount }: { saleCount: number }) {
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
      <div className="relative px-5 py-6 text-center sm:px-10 lg:px-12 lg:py-5">
        <h2 className="text-[16px] font-semibold uppercase text-[#dbb87c]">
          What Our Customers Say
        </h2>
        <Quote className="absolute left-4 top-[58px] size-5 fill-[#dfbd7f] text-[#dfbd7f] sm:left-9" />
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

export default async function Home() {
  const [featured, newArrivals, sale, heroBanners, promoBanners] = await Promise.all([
    productCatalog.list({ page: 1, pageSize: 6 }),
    productCatalog.newArrivals(),
    productCatalog.onSale(),
    marketingApi.listPublic('HOME_HERO').catch(() => [] as MarketingBanner[]),
    marketingApi.listPublic('HOME_PROMO').catch(() => [] as MarketingBanner[]),
  ]);
  const heroBanner = pickPrimaryBanner(heroBanners, FALLBACK_HERO);
  const promoBanner = pickPrimaryBanner(promoBanners, FALLBACK_PROMO);
  return (
    <main id="main-content" className="flex-1 bg-black">
      <Hero banner={heroBanner} />
      <Benefits />
      <HomePromo banner={promoBanner} />
      <CollectionGrid />
      <Featured products={featured.items} />
      <NewArrivals products={newArrivals.slice(0, 6)} />
      <SalePromo saleCount={sale.length} />
      <About />
      <Newsletter />
      <Instagram />
    </main>
  );
}

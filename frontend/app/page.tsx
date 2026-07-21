import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Headphones, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { productCatalog } from '@/features/products';
import type { CatalogProduct } from '@/features/products/types';
import { marketingApi } from '@/features/marketing/api';
import {
  FALLBACK_BANNERS,
  pickHeroSlides,
  pickPrimaryBanner,
  type HeroSlide,
} from '@/features/marketing/banners';
import type { MarketingBanner } from '@/features/marketing/types';
import { HomeHeroMobileCarousel } from '@/components/home/home-hero-mobile-carousel';
import {
  HomeHeroDesktopCarousel,
  type DesktopHeroSlide,
} from '@/components/home/home-hero-desktop-carousel';
import { CustomerReviewsSlider } from '@/components/home/customer-reviews-slider';
import { NewsletterForm } from '@/components/shared/newsletter-form';
import { ProductCard } from '@/components/shared/product-card';
import {
  HomeFeaturedSectionSkeleton,
  HomeHeroSkeleton,
  HomeNewArrivalsSectionSkeleton,
  HomeSalePromoSkeleton,
} from '@/components/loading';

// Rendered at request time: catalog data comes from the API, which is not
// reachable during `next build` (images are built without a live backend).
export const dynamic = 'force-dynamic';

const FALLBACK_HERO = FALLBACK_BANNERS.HOME_HERO;
const DESKTOP_HERO_SLIDES: DesktopHeroSlide[] = [
  {
    id: 'desktop-men',
    eyebrow: "MEN'S COLLECTION OVERVIEW",
    title: "MEN'S COLLECTION",
    description: 'Tailored fits and elevated essentials crafted for everyday confidence.',
    href: '/category/men',
    ctaLabel: 'SHOP MEN',
    image: '/images/home/collection-men.webp',
    imageAlt: "Men's collection overview",
  },
  {
    id: 'desktop-women',
    eyebrow: "WOMEN'S COLLECTION OVERVIEW",
    title: "WOMEN'S COLLECTION",
    description: 'Refined silhouettes and premium textures designed for modern movement.',
    href: '/category/women',
    ctaLabel: 'SHOP WOMEN',
    image: '/images/home/collection-women.webp',
    imageAlt: "Women's collection overview",
  },
  {
    id: 'desktop-kids',
    eyebrow: "KIDS' COLLECTION OVERVIEW",
    title: "KIDS' COLLECTION",
    description: 'Comfort-first pieces with playful energy for every active day.',
    href: '/category/kids',
    ctaLabel: 'SHOP KIDS',
    image: '/images/home/kids-1.webp',
    imageAlt: "Kids' collection overview",
  },
];

const collections = [
  { title: "MEN'S\nCOLLECTION", href: '/category/men', image: 'collection-men.webp' },
  { title: "WOMEN'S\nCOLLECTION", href: '/category/women', image: 'collection-women.webp' },
  { title: 'NEW\nARRIVALS', href: '/new-arrivals', image: 'collection-new.webp' },
  { title: 'SALE\nUP TO 40% OFF', href: '/sale', image: 'collection-sale.webp' },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold uppercase tracking-tight text-[#111111] sm:text-[17px]">
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
        className="flex shrink-0 items-center gap-2 text-[11px] font-medium text-[#111111] transition-colors hover:text-[#C9A227]"
      >
        {linkLabel} <ArrowRight className="size-4 text-[#C9A227]" />
      </Link>
    </div>
  );
}

function ProductRail({ products }: { products: CatalogProduct[] }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 min-[480px]:grid-cols-3 lg:grid-cols-6">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 2} theme="light" />
      ))}
    </div>
  );
}

function HeroDesktop({ banner }: { banner: MarketingBanner }) {
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
    <section className="relative hidden h-[80svh] min-h-[420px] overflow-hidden border-b border-[#E5E7EB] bg-[#FAFAFA] md:block lg:hidden">
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
      <div className="absolute inset-0 bg-linear-to-r from-[#FAFAFA] via-[#FAFAFA]/92 to-[#FAFAFA]/20 sm:inset-y-0 sm:left-0 sm:w-[68%] sm:bg-linear-to-r sm:from-[#FAFAFA] sm:via-[#FAFAFA]/85 sm:to-transparent" />
      <div className="relative mx-auto flex h-full max-w-[1400px] items-center px-5 sm:px-[10.2%]">
        <div className="max-w-[390px]">
          <p className="text-xs font-semibold uppercase tracking-[.11em] text-[#C9A227] sm:text-[14px]">
            Discover Your Edge
          </p>
          <h1 className="mt-2 text-[clamp(42px,12vw,64px)] font-extrabold leading-[.93] tracking-[-.055em] text-[#111111]">
            {lead} {accent ? <span className="block text-[#C9A227]">{accent}</span> : null}
          </h1>
          {banner.subtitle ? (
            <p className="mt-3 max-w-[260px] text-sm font-medium leading-[1.5] text-[#555555]">
              {banner.subtitle}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2.5 sm:gap-3">
            <Link
              href={ctaHref}
              className="border border-[#111111] bg-[#111111] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111] sm:px-5"
            >
              {ctaLabel}
            </Link>
            <Link
              href="/new-arrivals"
              className="border border-[#111111] bg-transparent px-4 py-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#111111] transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] sm:px-5"
            >
              NEW ARRIVALS
            </Link>
          </div>
        </div>
      </div>
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-4">
        <span className="size-2.5 rounded-full bg-[#C9A227]" />
        <span className="size-2.5 rounded-full border border-[#111111]/35" />
        <span className="size-2.5 rounded-full border border-[#111111]/35" />
      </div>
    </section>
  );
}

function Hero({ banner, slides }: { banner: MarketingBanner; slides: HeroSlide[] }) {
  return (
    <>
      <HomeHeroMobileCarousel slides={slides} />
      <HeroDesktop banner={banner} />
      <HomeHeroDesktopCarousel slides={DESKTOP_HERO_SLIDES} />
    </>
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
    <section className="hidden border-b border-[#E5E7EB] bg-[#FAFAFA] lg:block">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-y-4 px-5 py-8 min-[440px]:grid-cols-2 sm:px-7 lg:grid-cols-4 lg:gap-y-0 lg:py-10">
        {benefits.map(([Icon, title, text], index) => (
          <div
            key={title}
            className={`flex items-center gap-3 px-2 sm:px-4 ${index ? 'lg:border-l lg:border-[#E5E7EB]' : ''}`}
          >
            <Icon className="size-8 shrink-0 text-[#C9A227]" strokeWidth={1.5} />
            <div>
              <p className="text-xs font-bold text-[#111111]">{title}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-[#555555]">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CollectionGrid() {
  return (
    <section className="bg-[#FAFAFA]">
      <div className="mx-auto max-w-[1400px] px-3 py-10 sm:px-6 sm:py-14">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {collections.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative aspect-[.9] overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] sm:aspect-[1.05] lg:h-[325px] lg:aspect-auto"
            >
              <Image
                src={`/images/home/${item.image}`}
                alt=""
                fill
                quality={85}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 330px"
                className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-linear-to-t from-[#111111]/70 via-transparent to-[#111111]/5" />
              <span className="absolute bottom-13 left-3 whitespace-pre-line text-[clamp(15px,4vw,20px)] font-bold leading-[1.05] text-[#111111]">
                {item.title}
              </span>
              <span className="absolute bottom-3 left-3 border border-[#111111] bg-[#111111] px-2.5 py-1.5 text-[10px] font-bold text-white transition-colors group-hover:border-[#C9A227] group-hover:bg-[#C9A227] group-hover:text-[#111111]">
                SHOP NOW
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Featured({ products }: { products: CatalogProduct[] }) {
  return (
    <section className="bg-[#FAFAFA]">
      <div className="mx-auto max-w-[1400px] px-3 py-10 sm:px-6 sm:py-14">
        <SectionHeader title="Featured Products" href="/shop" />
        <ProductRail products={products} />
      </div>
    </section>
  );
}

/** Fresh drops — drives discovery without replacing Featured */
function NewArrivals({ products }: { products: CatalogProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1400px] px-3 py-10 sm:px-6 sm:py-14">
        <SectionHeader title="New Arrivals" href="/new-arrivals" />
        <ProductRail products={products} />
      </div>
    </section>
  );
}

/** Single purposeful promo — urgency without clutter */
function SalePromo({ saleCount }: { saleCount: number }) {
  return (
    <section className="bg-[#FAFAFA]">
      <div className="mx-auto max-w-[1400px] px-3 py-10 sm:px-6 sm:py-14">
        <Link
          href="/sale"
          className="group relative flex min-h-[160px] items-center overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] sm:min-h-[180px]"
        >
          <Image
            src="/images/home/collection-sale.webp"
            alt=""
            fill
            quality={85}
            sizes="(max-width: 1400px) 100vw, 1400px"
            className="object-cover opacity-25 transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-r from-[#FAFAFA] via-[#FAFAFA]/85 to-[#FAFAFA]/40" />
          <div className="relative px-5 py-10 sm:px-10">
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
              Limited Time
            </p>
            <p className="mt-1 text-[clamp(24px,5vw,36px)] font-extrabold tracking-[-.03em] text-[#111111]">
              SALE UP TO <span className="text-[#C9A227]">40% OFF</span>
            </p>
            <p className="mt-1 text-xs text-[#555555]">
              {saleCount} select pieces — while stocks last
            </p>
            <span className="mt-5 inline-flex items-center gap-2 border border-[#111111] bg-[#111111] px-4 py-2 text-[11px] font-bold uppercase tracking-[.08em] text-white transition-colors group-hover:border-[#C9A227] group-hover:bg-[#C9A227] group-hover:text-[#111111]">
              SHOP SALE <ArrowRight className="size-3.5" />
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-3 py-10 sm:px-6 sm:py-14 lg:grid-cols-2 lg:gap-5">
        <div className="relative min-h-[220px] overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] px-5 py-8 shadow-[0_2px_10px_rgba(0,0,0,0.04)] sm:min-h-[210px] sm:px-7 lg:min-h-[200px] lg:py-8">
          <Image
            src="/images/home/about-models.webp"
            alt="Elevate Apparel models"
            fill
            quality={85}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-right"
          />
          <div className="absolute inset-y-0 left-0 w-[72%] bg-linear-to-r from-[#FAFAFA] via-[#FAFAFA]/95 to-transparent sm:w-[55%]" />
          <div className="relative max-w-[270px]">
            <h2 className="text-[16px] font-semibold uppercase text-[#111111]">
              About Elevate Apparel
            </h2>
            <p className="mt-3 text-xs leading-[1.5] text-[#555555]">
              Elevate Apparel is more than just clothing. It&apos;s a mindset. We create premium
              quality, minimal and timeless pieces to elevate your everyday life.
            </p>
            <Link
              href="/about"
              className="mt-4 inline-block border border-[#111111] bg-[#111111] px-4 py-2 text-[11px] font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
            >
              LEARN MORE
            </Link>
          </div>
        </div>
        <CustomerReviewsSlider />
      </div>
    </section>
  );
}

/** Email capture — high-converting fashion pattern, kept minimal */
function Newsletter() {
  return (
    <section className="bg-[#FAFAFA]">
      <div className="mx-auto max-w-[1400px] px-3 py-10 sm:px-6 sm:py-14">
        <div className="rounded-lg border border-[#E5E7EB] bg-white px-5 py-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.04)] sm:px-10 sm:py-14">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
            Stay Elevated
          </p>
          <h2 className="mt-2 text-[clamp(22px,4vw,28px)] font-extrabold tracking-[-.03em] text-[#111111]">
            NEW DROPS &amp; MEMBER OFFERS
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#555555]">
            Be first to know about new arrivals, restocks, and exclusive offers. No spam — just the
            edit.
          </p>
          <NewsletterForm theme="light" />
        </div>
      </div>
    </section>
  );
}

function Instagram() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1400px] px-3 py-10 text-center sm:px-7 sm:py-14">
        <h2 className="text-[15px] font-semibold uppercase text-[#111111]">
          Follow Us on Instagram
        </h2>
        <p className="mt-0.5 text-xs text-[#555555]">@elevate.apparel</p>
        <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-2.5">
          {Array.from({ length: 8 }, (_, index) => (
            <a
              key={index}
              href="#"
              aria-label={`Instagram post ${index + 1}`}
              className="relative block aspect-[1.27] overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-transform duration-300 hover:scale-[1.02]"
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
      </div>
    </section>
  );
}

async function HomeHeroSection() {
  const heroBanners = await marketingApi
    .listPublic('HOME_HERO')
    .catch(() => [] as MarketingBanner[]);
  const heroBanner = pickPrimaryBanner(heroBanners, FALLBACK_HERO);
  const heroSlides = pickHeroSlides(heroBanners.length > 0 ? heroBanners : [FALLBACK_HERO]);
  return <Hero banner={heroBanner} slides={heroSlides} />;
}

async function HomeFeaturedSection() {
  const featured = await productCatalog.list({ page: 1, pageSize: 6 });
  return <Featured products={featured.items} />;
}

async function HomeNewArrivalsSection() {
  const newArrivals = await productCatalog.newArrivals();
  return <NewArrivals products={newArrivals.slice(0, 6)} />;
}

async function HomeSalePromoSection() {
  const sale = await productCatalog.onSale();
  return <SalePromo saleCount={sale.length} />;
}

export default function Home() {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]">
      <Suspense fallback={<HomeHeroSkeleton />}>
        <HomeHeroSection />
      </Suspense>
      <Benefits />
      <CollectionGrid />
      <Suspense fallback={<HomeFeaturedSectionSkeleton />}>
        <HomeFeaturedSection />
      </Suspense>
      <Suspense fallback={<HomeNewArrivalsSectionSkeleton />}>
        <HomeNewArrivalsSection />
      </Suspense>
      <Suspense fallback={<HomeSalePromoSkeleton />}>
        <HomeSalePromoSection />
      </Suspense>
      <About />
      <Newsletter />
      <Instagram />
    </main>
  );
}

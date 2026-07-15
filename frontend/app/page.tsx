import { existsSync } from 'node:fs';
import { join } from 'node:path';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, RefreshCcw, ShieldCheck, Truck } from 'lucide-react';
import { ProductCard } from '@/components/shared/product-card';
import { homeCategories, homeSections } from '@/features/products/data';
import type { HomeSection } from '@/features/products/types';

// Full-cover hero banner. Drop your artwork at frontend/public/banners/hero.jpg
// (recommended ~3200×1200); the gradient hero below renders until it exists.
const heroBannerPath = '/banners/hero.jpg';
const hasHeroBanner = existsSync(join(process.cwd(), 'public', heroBannerPath));

function Hero() {
  if (hasHeroBanner) {
    return (
      <section className="relative overflow-hidden bg-ink">
        <Link
          href="/category/football-jerseys"
          className="block focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-gold"
        >
          <div className="relative aspect-3200/1218 w-full">
            <Image
              src={heroBannerPath}
              alt="Official jersey collection — shop the new season fan edition jerseys"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </Link>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-wrap justify-center gap-3">
          <Link
            href="/shop"
            className="group inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-ink shadow-lg shadow-black/40 transition-all hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Shop Now
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          {['Men', 'Women', 'Kids'].map((label) => (
            <Link
              key={label}
              href={`/category/${label.toLowerCase()}`}
              className="rounded-full border border-white/40 bg-black/30 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:border-gold hover:text-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className="relative overflow-hidden bg-linear-to-br from-zinc-950 via-ink to-zinc-900">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-gold/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-1/4 size-80 rounded-full bg-gold/10 blur-3xl"
      />
      <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-5 px-4 py-20 sm:py-28">
        <p className="rounded-full border border-gold/40 bg-gold/10 px-4 py-1 text-xs font-semibold tracking-[0.25em] text-gold">
          NEW SEASON
        </p>
        <h1 className="max-w-2xl font-serif text-4xl font-bold tracking-tight text-white sm:text-6xl">
          Elevate your everyday style.
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-zinc-300">
          Premium tees, polos, panjabis, and activewear — crafted with quality fabrics and delivered
          to your door.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href="/shop"
            className="group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3 text-sm font-semibold text-ink shadow-lg shadow-black/40 transition-all hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Shop Now
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          {['Men', 'Women', 'Kids'].map((label) => (
            <Link
              key={label}
              href={`/category/${label.toLowerCase()}`}
              className="rounded-full border border-zinc-600 px-7 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-gold hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitsBar() {
  const benefits = [
    { icon: Truck, title: 'Fast Nationwide Delivery', detail: 'Free over ৳2,000' },
    { icon: ShieldCheck, title: 'Secure Payment', detail: 'Encrypted checkout' },
    { icon: RefreshCcw, title: 'Easy Returns', detail: '7-day return policy' },
  ];
  return (
    <section aria-label="Store benefits" className="border-b border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:grid-cols-3">
        {benefits.map(({ icon: Icon, title, detail }) => (
          <div key={title} className="flex items-center justify-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold-dark">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-zinc-900">{title}</p>
              <p className="text-xs text-zinc-500">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoryGrid() {
  return (
    <section aria-labelledby="categories-heading" className="mx-auto max-w-7xl px-4">
      <h2
        id="categories-heading"
        className="text-center font-serif text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl"
      >
        Find Your Thing
      </h2>
      <p className="mt-2 text-center text-sm text-zinc-500">Browse our most-loved categories</p>
      <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {homeCategories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="group overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <div className="overflow-hidden">
              <div
                className="aspect-square w-full transition-transform duration-300 group-hover:scale-105"
                style={{
                  background: `linear-gradient(150deg, hsl(${category.imageHue} 50% 90%), hsl(${category.imageHue} 45% 74%))`,
                }}
              />
            </div>
            <p className="px-2 py-2.5 text-center text-xs font-medium text-zinc-700 group-hover:text-gold-dark">
              {category.name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProductSection({ section }: { section: HomeSection }) {
  return (
    <section aria-labelledby={`section-${section.id}`} className="mx-auto max-w-7xl px-4">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2
          id={`section-${section.id}`}
          className="font-serif text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl"
        >
          {section.title}
        </h2>
        <Link
          href={section.viewMoreHref}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-gold-dark transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          View More
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {section.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function NewsletterCta() {
  return (
    <section className="mx-auto max-w-7xl px-4">
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-zinc-950 via-ink to-zinc-900 px-6 py-12 text-center sm:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-gold/15 blur-3xl"
        />
        <div className="relative">
          <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-gold" />
          <h2 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Join the ElevateApparel community
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
            Create an account for exclusive member offers, faster checkout, and early access to new
            arrivals.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="rounded-full bg-gold px-7 py-3 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-zinc-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main id="main-content" className="flex-1 bg-card">
      <Hero />
      <BenefitsBar />
      <div className="space-y-16 py-16">
        <CategoryGrid />
        {homeSections.map((section) => (
          <ProductSection key={section.id} section={section} />
        ))}
        <NewsletterCta />
      </div>
    </main>
  );
}

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

const collections = [
  { title: "MEN'S\nCOLLECTION", href: '/category/men', image: 'collection-men.webp' },
  { title: "WOMEN'S\nCOLLECTION", href: '/category/women', image: 'collection-women.webp' },
  { title: 'NEW\nARRIVALS', href: '/new-arrivals', image: 'collection-new.webp' },
  { title: 'SALE\nUP TO 40% OFF', href: '/sale', image: 'collection-sale.webp' },
];

const products = [
  ['Elevate Oversized Tee', 'Black', '৳1,190'],
  ['Essential Tee', 'Off White', '৳1,090'],
  ['Elevate Hoodie', 'Black', '৳1,890'],
  ['Minimal Tee', 'Beige', '৳1,090'],
  ['Elevate Jogger', 'Black', '৳1,590'],
  ["Women's Hoodie", 'Cream', '৳1,890'],
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold uppercase tracking-tight text-white sm:text-[17px]">
      {children}
    </h2>
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
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>Featured Products</SectionTitle>
        <Link
          href="/shop"
          className="flex shrink-0 items-center gap-2 text-[11px] font-medium text-white"
        >
          VIEW ALL <ArrowRight className="size-4 text-[#dcb878]" />
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-5 min-[480px]:grid-cols-3 lg:grid-cols-6">
        {products.map(([name, color, price], index) => (
          <Link key={name} href={`/product/${index + 1}`} className="group min-w-0">
            <div className="relative overflow-hidden rounded-[4px] bg-[#e4e3e1]">
              <Image
                src={`/images/home/product-${index + 1}.webp`}
                alt={name}
                width={304}
                height={368}
                quality={85}
                sizes="(max-width: 480px) 50vw, (max-width: 1024px) 33vw, 16vw"
                className="aspect-[.826] h-auto w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <Heart
                className="absolute right-2 top-2 size-[17px] stroke-[#111]"
                strokeWidth={1.5}
              />
            </div>
            <p className="mt-2 truncate text-[11px] font-medium leading-4 text-white">{name}</p>
            <p className="text-[11px] leading-4 text-[#d0cbc4]">{color}</p>
            <p className="mt-1 text-[13px] font-semibold text-[#e5c17d]">{price}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="mx-auto mt-5 grid max-w-[1400px] grid-cols-1 bg-[#111110] lg:mt-3 lg:grid-cols-2">
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

function Instagram() {
  return (
    <section className="mx-auto max-w-[1400px] bg-black px-3 pb-3 pt-5 text-center sm:px-7 sm:pb-2 sm:pt-2">
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
      <About />
      <Instagram />
    </main>
  );
}

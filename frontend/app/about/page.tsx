import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, Heart, Sparkles, Target } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Elevate Apparel — premium quality, minimal and timeless pieces for everyday life.',
};

const values = [
  {
    icon: Sparkles,
    title: 'Premium Quality',
    text: 'Heavyweight fabrics and clean construction — pieces that feel as good as they look.',
  },
  {
    icon: Target,
    title: 'Timeless Design',
    text: 'Minimal silhouettes that outlast trends. Elevate is a mindset, not a moment.',
  },
  {
    icon: Heart,
    title: 'Everyday Comfort',
    text: 'Cut for real life in Dhaka and beyond — move easy, look sharp.',
  },
  {
    icon: BadgeCheck,
    title: 'Honest Value',
    text: 'Fair pricing, easy returns, and service that respects your time.',
  },
];

export default function AboutPage() {
  return (
    <main id="main-content" className="flex-1 bg-black">
      {/* Unique: editorial split story */}
      <section className="border-b border-[#2d2a27] bg-[#090909]">
        <div className="mx-auto grid max-w-[1400px] lg:grid-cols-2">
          <div className="relative min-h-[320px] overflow-hidden sm:min-h-[420px]">
            <Image
              src="/images/home/about-models.webp"
              alt="Elevate Apparel models"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-[#090909]/80 to-transparent lg:bg-linear-to-r lg:from-transparent lg:to-[#090909]/40" />
          </div>
          <div className="flex flex-col justify-center px-5 py-12 sm:px-7 lg:px-14 lg:py-16">
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
              Our Story
            </p>
            <h1 className="mt-2 text-[clamp(36px,7vw,52px)] font-extrabold leading-[.95] tracking-[-.04em] text-white">
              ABOUT <span className="text-[#e3bb78]">ELEVATE</span>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-[#eee9e1]">
              Elevate Apparel is more than clothing. It&apos;s a mindset. We create premium quality,
              minimal and timeless pieces to elevate your everyday life — from Dhaka to the world.
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#b5b0a8]">
              Est. 2024. Designed for presence. Built for comfort. Worn with intention.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link
                href="/shop"
                className="border border-[#efc677] bg-[#e5bd79] px-5 py-2.5 text-[11px] font-bold uppercase text-[#18120b] hover:bg-[#eec98a]"
              >
                Shop The Edit
              </Link>
              <Link
                href="/contact"
                className="border border-[#cbc6bf] px-5 py-2.5 text-[11px] font-bold uppercase text-white hover:border-[#e3bb78] hover:text-[#e3bb78]"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-12 sm:px-7 sm:py-16">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          What We Stand For
        </p>
        <h2 className="mt-2 text-center text-xl font-bold uppercase tracking-tight text-white sm:text-2xl">
          The Elevate Standard
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, title, text }) => (
            <div key={title} className="border-t border-[#2d2a27] pt-4">
              <Icon className="size-6 text-[#e3bb78]" strokeWidth={1.5} />
              <h3 className="mt-3 text-xs font-bold uppercase tracking-wide text-white">{title}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-[#b5b0a8]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[#2d2a27] bg-[#111110]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center sm:px-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
              Dhaka — Worldwide
            </p>
            <p className="mt-2 max-w-md text-lg font-bold text-white">
              Ready to elevate your everyday?
            </p>
          </div>
          <Link
            href="/register"
            className="border border-[#efc677] bg-[#e5bd79] px-5 py-2.5 text-[11px] font-bold uppercase text-[#18120b] hover:bg-[#eec98a]"
          >
            Create Account
          </Link>
        </div>
      </section>
    </main>
  );
}

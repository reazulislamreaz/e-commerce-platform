import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, MapPin, Navigation, Phone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Store',
  description: 'Visit Elevate Apparel flagship store in Wari, Dhaka.',
};

const hours = [
  ['Saturday – Thursday', '11:00 AM – 9:00 PM'],
  ['Friday', '3:00 PM – 9:00 PM'],
];

export default function StorePage() {
  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=Wari%2C+Dhaka%2C+Bangladesh';

  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]">
      <section className="overflow-hidden border-b border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto grid max-w-[1400px] lg:grid-cols-2">
          <div className="flex flex-col justify-center px-3 py-12 sm:px-6 sm:py-14 lg:py-16 lg:pr-10">
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
              Flagship Location
            </p>
            <h1 className="mt-2 text-[clamp(36px,7vw,56px)] font-extrabold leading-[.95] tracking-[-.04em] text-[#111111]">
              OUR <span className="text-[#C9A227]">STORE</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#555555]">
              Step into Elevate at Wari, Dhaka — try the fit, feel the fabric, and elevate your
              everyday in person.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-[#111111] bg-[#111111] px-5 py-2.5 text-[11px] font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
              >
                <Navigation className="size-3.5" strokeWidth={1.7} />
                Get Directions
              </a>
              <Link
                href="/shop"
                className="border border-[#cbc6bf] px-5 py-2.5 text-[11px] font-bold uppercase text-[#111111] transition-colors hover:border-[#C9A227] hover:text-[#C9A227]"
              >
                Shop Online
              </Link>
            </div>
          </div>
          <div className="relative min-h-[280px] overflow-hidden sm:min-h-[360px] lg:min-h-[480px]">
            <Image
              src="/images/home/hero.webp"
              alt="Elevate Apparel store atmosphere"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-linear-to-t from-[#111111]/50 to-transparent lg:bg-linear-to-l lg:from-transparent lg:to-[#111111]/25" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1400px] gap-0 px-3 py-10 sm:px-6 lg:grid-cols-3 lg:py-14">
        <div className="border-b border-[#E5E7EB] py-6 lg:border-b-0 lg:border-r lg:pr-8">
          <MapPin className="size-5 text-[#C9A227]" strokeWidth={1.5} />
          <h2 className="mt-3 text-xs font-bold uppercase tracking-wide text-[#111111]">Address</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#555555]">
            Elevate Apparel
            <br />
            Wari, Dhaka
            <br />
            Bangladesh
          </p>
        </div>
        <div className="border-b border-[#E5E7EB] py-6 lg:border-b-0 lg:border-r lg:px-8">
          <Clock className="size-5 text-[#C9A227]" strokeWidth={1.5} />
          <h2 className="mt-3 text-xs font-bold uppercase tracking-wide text-[#111111]">Hours</h2>
          <ul className="mt-2 space-y-2 text-sm text-[#555555]">
            {hours.map(([day, time]) => (
              <li key={day} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                <span className="text-[#555555]">{day}</span>
                <span>{time}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="py-6 lg:pl-8">
          <Phone className="size-5 text-[#C9A227]" strokeWidth={1.5} />
          <h2 className="mt-3 text-xs font-bold uppercase tracking-wide text-[#111111]">Contact</h2>
          <p className="mt-2 text-sm text-[#555555]">
            <a href="tel:+8801234567890" className="block hover:text-[#C9A227]">
              +880 1234-567890
            </a>
            <a href="mailto:hello@elevateapparel.com" className="mt-1 block hover:text-[#C9A227]">
              hello@elevateapparel.com
            </a>
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-block text-[11px] font-bold uppercase tracking-wide text-[#C9A227] hover:text-[#D4B03A]"
          >
            Send a message →
          </Link>
        </div>
      </section>

      <section className="border-t border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-4 px-3 py-8 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
              Visit Wari
            </p>
            <p className="mt-1 text-sm text-[#555555]">
              See the full edit on the floor — tees, hoodies, and essentials ready to try.
            </p>
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 border border-[#111111] bg-[#111111] px-5 py-2.5 text-[11px] font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
          >
            Open in Maps
          </a>
        </div>
      </section>
    </main>
  );
}

import Link from 'next/link';
import { Facebook, Instagram, Youtube } from 'lucide-react';
import { BrandBadge } from '@/components/shared/brand-badge';

const infoLinks = [
  { name: 'About Us', href: '/about' },
  { name: 'Terms & Conditions', href: '/terms' },
  { name: 'Privacy Policy', href: '/privacy' },
  { name: 'Return & Refund Policy', href: '/returns' },
  { name: 'FAQs', href: '/faqs' },
  { name: 'Contact Us', href: '/contact' },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-zinc-950 text-zinc-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="flex items-center gap-2.5 font-serif text-2xl font-bold tracking-tight text-white">
            <BrandBadge />
            <span>
              Elevate<span className="text-gold">Apparel</span>
            </span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Elevate your everyday. Premium-quality apparel for men, women, and kids — designed for
            comfort and confidence.
          </p>
          <div className="mt-5 flex gap-2">
            {[
              { label: 'Facebook', icon: Facebook },
              { label: 'Instagram', icon: Instagram },
              { label: 'YouTube', icon: Youtube },
            ].map(({ label, icon: Icon }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="flex size-9 items-center justify-center rounded-full bg-zinc-900 transition-colors hover:bg-gold hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Information</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {infoLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Support</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              Hotline:{' '}
              <a href="tel:+8809600000000" className="transition-colors hover:text-white">
                +880 9600 000000
              </a>
            </li>
            <li>
              Email:{' '}
              <a
                href="mailto:support@elevateapparel.example"
                className="transition-colors hover:text-white"
              >
                support@elevateapparel.example
              </a>
            </li>
            <li>
              <Link href="/track-order" className="transition-colors hover:text-white">
                Track Your Order
              </Link>
            </li>
            <li>
              <Link href="/stores" className="transition-colors hover:text-white">
                Store Locations
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Newsletter</h3>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Subscribe to get special offers and new-arrival updates.
          </p>
          <form className="mt-4 flex" action="/newsletter" method="post">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              name="email"
              required
              placeholder="Your email"
              className="w-full rounded-l-full border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-500 focus:border-gold"
            />
            <button
              type="submit"
              className="rounded-r-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Join
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-zinc-800 py-5 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} ElevateApparel. All rights reserved.
      </div>
    </footer>
  );
}

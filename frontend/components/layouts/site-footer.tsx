import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Mail, MapPin, Phone, Youtube } from 'lucide-react';

const columns = [
  [
    'SHOP',
    [
      ['All Products', '/shop'],
      ['Men', '/category/men'],
      ['Women', '/category/women'],
      ['New Arrivals', '/new-arrivals'],
      ['Sale', '/sale'],
    ],
  ],
  [
    'CUSTOMER SERVICE',
    [
      ['Track Order', '/track-order'],
      ['Returns & Exchanges', '/returns'],
      ['Shipping Policy', '/shipping'],
      ['FAQ', '/faqs'],
      ['Size Guide', '/size-guide'],
    ],
  ],
  [
    'ABOUT US',
    [
      ['Our Story', '/about'],
      ['Store', '/store'],
      ['Terms & Conditions', '/terms'],
      ['Privacy Policy', '/privacy'],
      ['Contact Us', '/contact'],
    ],
  ],
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-[#2d2a27] bg-[#090909] text-white">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-5 py-8 text-xs sm:grid-cols-2 sm:px-7 lg:grid-cols-[1.5fr_.85fr_1.2fr_1fr_1.15fr] lg:gap-6 lg:py-9">
        <div className="flex flex-col">
          <Image
            src="/images/brand/elevate-apparel-logo.webp"
            alt="Elevate Apparel"
            width={1248}
            height={179}
            className="h-8 w-auto self-start object-contain"
          />
          <p className="mt-3 leading-5 text-[#eeeae4]">
            Elevate your style.
            <br />
            Elevate your life.
          </p>
          <div className="mt-4 flex items-center gap-4 text-[#e8e1d8]">
            <a
              href="https://www.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="transition-colors hover:text-[#e3bb78]"
            >
              <Facebook className="size-4" />
            </a>
            <a
              href="https://www.instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="transition-colors hover:text-[#e3bb78]"
            >
              <Instagram className="size-4" />
            </a>
            <a
              href="https://www.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="transition-colors hover:text-[#e3bb78]"
            >
              <Youtube className="size-4" />
            </a>
          </div>
          <p className="mt-6 text-[10px] text-[#d4d0ca] lg:mt-auto">
            © 2024 Elevate Apparel. All Rights Reserved.
          </p>
        </div>
        {columns.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <h3 className="text-[12px] font-semibold tracking-wide">{title}</h3>
            <ul className="mt-3 space-y-2 text-[#e1ded9]">
              {links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="transition-colors hover:text-[#e3bb78]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div className="flex flex-col">
          <h3 className="text-[12px] font-semibold tracking-wide">CONTACT US</h3>
          <ul className="mt-3 space-y-2.5 text-[#e1ded9]">
            <li className="flex items-center gap-2">
              <Phone className="size-3.5 shrink-0 text-[#e2bb79]" />
              <a href="tel:+8801234567890" className="transition-colors hover:text-[#e3bb78]">
                +880 1234-567890
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-3.5 shrink-0 text-[#e2bb79]" />
              <a
                href="mailto:info@elevateapparel.com"
                className="transition-colors hover:text-[#e3bb78]"
              >
                info@elevateapparel.com
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-3.5 shrink-0 text-[#e2bb79]" />
              <Link href="/store" className="transition-colors hover:text-[#e3bb78]">
                Wari, Dhaka
              </Link>
            </li>
          </ul>
          <ul
            aria-label="Accepted payment methods"
            className="mt-6 flex flex-wrap items-center gap-1.5 lg:mt-auto"
          >
            <li className="rounded-[3px] bg-white px-2 py-1 text-[9px] font-extrabold italic tracking-tight text-[#183e7d]">
              VISA
            </li>
            <li
              aria-label="Mastercard"
              className="flex items-center rounded-[3px] bg-white px-2 py-1"
            >
              <span className="size-3 rounded-full bg-[#eb001b]" />
              <span className="-ml-1.5 size-3 rounded-full bg-[#f79e1b] mix-blend-multiply" />
            </li>
            <li className="rounded-[3px] bg-white px-2 py-1 text-[9px] font-bold text-[#e2136e]">
              bKash
            </li>
            <li className="rounded-[3px] bg-white px-2 py-1 text-[9px] font-bold text-[#ec1c24]">
              নগদ
            </li>
            <li className="rounded-[3px] bg-[#111] px-2 py-1 text-[9px] font-bold text-white ring-1 ring-white/25">
              COD
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

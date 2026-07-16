import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { playfair } from '@/lib/fonts';
import { AppProviders } from '@/providers/app-providers';
import { SiteHeader } from '@/components/layouts/site-header';
import { SiteFooter } from '@/components/layouts/site-footer';
import { ContactWidgetLazy } from '@/components/shared/contact-widget/contact-widget-lazy';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ElevateApparel — Elevate Your Everyday Style',
    template: '%s | ElevateApparel',
  },
  description:
    'Premium-quality apparel for men and women. Tees, polos, panjabis, and activewear designed for comfort and confidence.',
  openGraph: {
    type: 'website',
    locale: 'en_BD',
    siteName: 'Elevate Apparel',
    title: 'ElevateApparel — Elevate Your Everyday Style',
    description:
      'Premium-quality apparel for men and women. Designed for comfort and confidence.',
    images: [{ url: '/images/home/hero.webp', width: 1920, height: 1080, alt: 'Elevate Apparel' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ElevateApparel — Elevate Your Everyday Style',
    description:
      'Premium-quality apparel for men, women, and kids. Designed for comfort and confidence.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[4px] focus:bg-[#e5bd79] focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:uppercase focus:text-[#18120b]"
        >
          Skip to content
        </a>
        <AppProviders>
          <SiteHeader />
          {children}
          <SiteFooter />
          <ContactWidgetLazy />
        </AppProviders>
      </body>
    </html>
  );
}

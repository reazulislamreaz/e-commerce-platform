'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useState } from 'react';

const nav = [
  ['HOME', '/'], ['SHOP', '/shop'], ['MEN', '/category/men'], ['WOMEN', '/category/women'],
  ['NEW ARRIVALS', '/new-arrivals'], ['SALE', '/sale'], ['ABOUT US', '/about'], ['CONTACT US', '/contact'],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="z-40 bg-black text-white">
      <div className="flex min-h-[28px] items-center justify-center border-b border-[#282828] px-3 py-1 text-center text-[10px] font-semibold leading-4 text-[#f1eee9]">FREE DELIVERY ON ALL ORDERS OVER ৳1999 <span className="ml-1 text-[#e3bb77]">♣</span></div>
      <div className="mx-auto flex h-[56px] max-w-[1400px] items-center border-b border-[#292929] px-4 sm:px-7">
        <Link href="/" className="shrink-0" aria-label="Elevate Apparel home">
          <Image
            src="/images/brand/elevate-apparel-logo.jpeg"
            alt="Elevate Apparel"
            width={1248}
            height={179}
            priority
            className="h-7 w-auto object-contain sm:h-[37px]"
          />
        </Link>
        <nav aria-label="Main navigation" className="mx-auto hidden items-center gap-[27px] lg:flex">{nav.map(([name, href], index) => <Link key={href} href={href} className={`relative py-[20px] text-[11px] font-semibold tracking-[-.01em] text-white ${index === 0 ? 'after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-[#e4bd7c]' : ''}`}>{name}</Link>)}</nav>
        <div className="ml-auto flex items-center gap-3 pl-3 sm:gap-5 sm:pl-5 lg:ml-0"><button aria-label="Search" className="p-1"><Search className="size-5" strokeWidth={1.7} /></button><Link href="/login" aria-label="Account" className="p-1"><UserRound className="size-5" strokeWidth={1.7} /></Link><Link href="/cart" aria-label="Shopping bag" className="relative p-1"><ShoppingBag className="size-5" strokeWidth={1.7} /><span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#e5bd78] text-[9px] font-bold text-black">0</span></Link><button type="button" aria-label={open ? 'Close menu' : 'Open menu'} className="p-1 lg:hidden" onClick={() => setOpen(!open)}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button></div>
      </div>
      {open && <nav className="border-b border-[#292929] px-5 py-3 lg:hidden">{nav.map(([name, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="block border-b border-white/5 py-2.5 text-xs font-semibold tracking-wide">{name}</Link>)}</nav>}
    </header>
  );
}

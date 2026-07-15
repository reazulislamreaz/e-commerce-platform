import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Mail, MapPin, Phone, Youtube } from 'lucide-react';

const columns = [
  ['SHOP', ['All Products', 'Men', 'Women', 'New Arrivals', 'Sale']],
  ['CUSTOMER SERVICE', ['Track Order', 'Returns & Exchanges', 'Shipping Policy', 'FAQ', 'Size Guide']],
  ['ABOUT US', ['Our Story', 'Terms & Conditions', 'Privacy Policy', 'Contact Us']],
] as const;

export function SiteFooter() {
  return <footer className="border-t border-[#2d2a27] bg-[#090909] text-white"><div className="mx-auto grid max-w-[1024px] grid-cols-1 gap-6 px-5 py-7 text-xs sm:grid-cols-2 sm:gap-7 sm:px-7 sm:py-5 sm:text-[10px] lg:grid-cols-[1.45fr_.8fr_1.15fr_.95fr] lg:py-4"><div><Image src="/images/brand/elevate-apparel-logo.jpeg" alt="Elevate Apparel" width={1248} height={179} className="h-[30px] w-auto object-contain" /><p className="mt-2 leading-5 text-[#eee] sm:leading-4">Elevate your style.<br />Elevate your life.</p><div className="mt-2 flex gap-4 text-[#e8e1d8]"><Facebook className="size-4 sm:size-3.5" /><Instagram className="size-4 sm:size-3.5" /><span className="text-[13px]">♪</span><Youtube className="size-4 sm:size-3.5" /></div><p className="mt-3 text-[10px] text-[#d4d0ca] sm:text-[9px]">© 2024 Elevate Apparel. All Rights Reserved.</p></div>{columns.map(([title, links]) => <nav key={title}><h3 className="text-[12px] font-semibold sm:text-[11px] sm:font-medium">{title}</h3><ul className="mt-2 space-y-1.5 leading-4 text-[#e1ded9] sm:space-y-1 sm:leading-3">{links.map(link => <li key={link}><Link href="#">{link}</Link></li>)}</ul></nav>)}<div><h3 className="text-[12px] font-semibold sm:text-[11px] sm:font-medium">CONTACT US</h3><ul className="mt-2 space-y-2 text-[#e1ded9] sm:space-y-1.5"><li className="flex gap-2"><Phone className="mt-0.5 size-3 shrink-0 text-[#e2bb79]" />+880 1234-567890</li><li className="flex gap-2"><Mail className="mt-0.5 size-3 shrink-0 text-[#e2bb79]" />info@elevateapparel.com</li><li className="flex gap-2"><MapPin className="mt-0.5 size-3 shrink-0 text-[#e2bb79]" />Dhaka, Bangladesh</li></ul><div className="mt-4 flex flex-wrap gap-1"><span className="bg-white px-1.5 py-1 text-[9px] font-bold text-[#183e7d]">VISA</span><span className="bg-white px-1.5 py-1 text-[9px] font-bold text-[#d32b28]">●●</span><span className="bg-white px-1.5 py-1 text-[8px] font-bold text-pink-600">bKash</span><span className="bg-white px-1.5 py-1 text-[8px] font-bold text-red-600">নগদ</span><span className="bg-white px-1.5 py-1 text-[8px] font-bold text-black">COD</span></div></div></div></footer>;
}

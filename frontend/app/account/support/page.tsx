'use client';

import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5">
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">
          Support / Contact
        </h2>
        <p className="mt-3 text-sm text-[#b5b0a8]">
          Need help with an order, fit, or delivery? Our team is here for you.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-[#e9e5de]">
          <li>
            Phone:{' '}
            <a href="tel:+8801234567890" className="text-[#e3bb78]">
              +880 1234-567890
            </a>
          </li>
          <li>
            Email:{' '}
            <a href="mailto:info@elevateapparel.com" className="text-[#e3bb78]">
              info@elevateapparel.com
            </a>
          </li>
          <li>
            Store:{' '}
            <Link href="/store" className="text-[#e3bb78]">
              Wari, Dhaka
            </Link>
          </li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/contact"
            className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-4 py-2 text-[10px] font-bold uppercase text-[#18120b]"
          >
            Contact Form
          </Link>
          <Link
            href="/faqs"
            className="rounded-[4px] border border-[#37332c] px-4 py-2 text-[10px] font-bold uppercase text-white"
          >
            FAQs
          </Link>
          <Link
            href="/track-order"
            className="rounded-[4px] border border-[#37332c] px-4 py-2 text-[10px] font-bold uppercase text-white"
          >
            Track Order
          </Link>
        </div>
      </div>
    </div>
  );
}

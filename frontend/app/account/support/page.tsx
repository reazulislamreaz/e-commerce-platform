'use client';

import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-[4px] border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">
          Support / Contact
        </h2>
        <p className="mt-3 text-sm text-[#555555]">
          Need help with an order, fit, or delivery? Our team is here for you.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-[#555555]">
          <li>
            Phone:{' '}
            <a href="tel:+8801234567890" className="text-[#C9A227]">
              +880 1234-567890
            </a>
          </li>
          <li>
            Email:{' '}
            <a href="mailto:info@elevateapparel.com" className="text-[#C9A227]">
              info@elevateapparel.com
            </a>
          </li>
          <li>
            Store:{' '}
            <Link href="/store" className="text-[#C9A227]">
              Wari, Dhaka
            </Link>
          </li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/contact"
            className="rounded-[4px] border border-[#111111] bg-[#111111] px-4 py-2 text-[10px] font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
          >
            Contact Form
          </Link>
          <Link
            href="/faqs"
            className="rounded-[4px] border border-[#E5E7EB] px-4 py-2 text-[10px] font-bold uppercase text-[#111111]"
          >
            FAQs
          </Link>
          <Link
            href="/track-order"
            className="rounded-[4px] border border-[#E5E7EB] px-4 py-2 text-[10px] font-bold uppercase text-[#111111]"
          >
            Track Order
          </Link>
        </div>
      </div>
    </div>
  );
}

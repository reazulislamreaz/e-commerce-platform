import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'FAQs' };

const faqs = [
  {
    q: 'How long does delivery take?',
    a: 'Inside Dhaka, most orders arrive within 1–3 business days. Outside Dhaka, allow 3–5 business days.',
  },
  {
    q: 'Do you offer free delivery?',
    a: 'Yes — free delivery on all orders over ৳1999.',
  },
  {
    q: 'How do I return an item?',
    a: 'Start a return from My Account → Returns within 7 days of delivery, or contact support.',
  },
  {
    q: 'How do size charts work?',
    a: 'Use our Size Guide before ordering. If something doesn’t fit, request an exchange from your account.',
  },
];

export default function FaqsPage() {
  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">Help</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">FAQs</h1>
        <div className="mt-8 space-y-3">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group rounded-[4px] border border-[#2d2a27] bg-[#111110] p-4"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-white marker:content-none">
                {item.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[#b5b0a8]">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-sm text-[#b5b0a8]">
          Still need help?{' '}
          <Link href="/contact" className="text-[#e3bb78] hover:text-[#eec98a]">
            Contact us
          </Link>
        </p>
      </section>
    </main>
  );
}

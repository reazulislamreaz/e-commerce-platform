import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'FAQs' };

const faqs = [
  {
    q: 'How long does delivery take?',
    a: 'Inside Dhaka, most orders arrive within 1–3 business days. Outside Dhaka, allow 3–5 business days.',
  },
  {
    q: 'How much is shipping?',
    a: 'Standard shipping is ৳120 across Bangladesh. You will receive tracking once your order ships.',
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
    <main id="main-content" className="flex-1 bg-[#FAFAFA]">
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">Help</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#111111]">FAQs</h1>
        <div className="mt-8 space-y-3">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group rounded-[4px] border border-[#E5E7EB] bg-white p-4"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-[#111111] marker:content-none">
                {item.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[#555555]">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-sm text-[#555555]">
          Still need help?{' '}
          <Link href="/contact" className="text-[#C9A227] hover:text-[#D4B03A]">
            Contact us
          </Link>
        </p>
      </section>
    </main>
  );
}

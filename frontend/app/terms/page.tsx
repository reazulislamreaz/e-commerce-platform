import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms & Conditions' };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      paragraphs={[
        'By using Elevate Apparel’s website and services, you agree to these terms.',
        'Product availability, pricing, and promotions may change without prior notice.',
        'Orders are subject to acceptance and stock confirmation.',
        'Unauthorized use of our brand assets, content, or trademarks is prohibited.',
      ]}
    />
  );
}

function LegalPage({ title, paragraphs }: { title: string; paragraphs: string[] }) {
  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]">
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">Legal</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#111111]">{title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#555555]">
          {paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </section>
    </main>
  );
}

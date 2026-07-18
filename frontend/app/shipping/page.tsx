import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Shipping Policy' };

export default function ShippingPage() {
  return (
    <InfoPage
      title="Shipping Policy"
      body={[
        'We ship across Bangladesh with reliable courier partners.',
        'Standard shipping is ৳120 across Bangladesh.',
        'You will receive tracking details once your order ships.',
        'Delivery timelines may vary during peak seasons and public holidays.',
      ]}
    />
  );
}

function InfoPage({ title, body }: { title: string; body: string[] }) {
  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          Customer Service
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">{title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#b5b0a8]">
          {body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </section>
    </main>
  );
}

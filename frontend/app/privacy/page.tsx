import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">Legal</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Privacy Policy</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#b5b0a8]">
          <p>
            We collect account, order, and contact information needed to fulfill purchases and
            support requests.
          </p>
          <p>
            Payment details are processed through secure payment partners and are not stored on our
            servers in full.
          </p>
          <p>
            You may request access or deletion of personal data by contacting
            info@elevateapparel.com.
          </p>
        </div>
      </section>
    </main>
  );
}

'use client';

import { useState, type FormEvent } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { toast, toastFromError } from '@/lib/toast';
import { submitContact } from '@/features/contact/api';

export default function ContactClient() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setSubmitting(true);
    setError(null);
    try {
      await submitContact({
        name: String(formData.get('name') ?? ''),
        email: String(formData.get('email') ?? ''),
        subject: String(formData.get('subject') ?? ''),
        message: String(formData.get('message') ?? ''),
        website: String(formData.get('website') ?? ''),
      });
      setSent(true);
      form.reset();
      toast.success('Message sent. We will get back to you shortly.', {
        dedupeKey: 'contact:sent',
      });
    } catch (err: unknown) {
      const message = toastFromError(err, 'Could not send your message. Please try again.');
      setError(message);
      toast.error(message, { dedupeKey: 'contact:error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="border-b border-[#2d2a27] bg-[#090909] px-5 py-12 text-center sm:px-7 sm:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          Get In Touch
        </p>
        <h1 className="mt-2 text-[clamp(36px,7vw,52px)] font-extrabold leading-[.95] tracking-[-.04em] text-white">
          CONTACT <span className="text-[#e3bb78]">US</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#eee9e1]">
          Questions about orders, fits, or partnerships? We&apos;re here — usually within one
          business day.
        </p>
      </section>

      <section className="mx-auto grid max-w-[1400px] lg:grid-cols-[.85fr_1.15fr]">
        <aside className="border-b border-[#2d2a27] bg-[#111110] px-5 py-10 sm:px-7 lg:border-b-0 lg:border-r lg:py-14">
          <h2 className="text-xs font-bold uppercase tracking-wide text-white">Reach Elevate</h2>
          <ul className="mt-6 space-y-5 text-sm text-[#eee9e1]">
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-[#e3bb78]" strokeWidth={1.5} />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#b5b0a8]">
                  Phone
                </p>
                <a href="tel:+8801234567890" className="mt-0.5 block hover:text-[#e3bb78]">
                  +880 1234-567890
                </a>
              </div>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-[#e3bb78]" strokeWidth={1.5} />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#b5b0a8]">
                  Email
                </p>
                <a
                  href="mailto:hello@elevateapparel.com"
                  className="mt-0.5 block hover:text-[#e3bb78]"
                >
                  hello@elevateapparel.com
                </a>
              </div>
            </li>
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[#e3bb78]" strokeWidth={1.5} />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#b5b0a8]">
                  Studio
                </p>
                <p className="mt-0.5">Wari, Dhaka</p>
                <p className="text-[#b5b0a8]">Bangladesh · Worldwide shipping</p>
              </div>
            </li>
          </ul>
          <div className="mt-10 border-t border-[#2d2a27] pt-6">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#b5b0a8]">
              Quick Links
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ['Shop', '/shop'],
                ['About', '/about'],
                ['Account', '/login'],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="border border-[#37332c] px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:border-[#e3bb78] hover:text-[#e3bb78]"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <div className="px-5 py-10 sm:px-7 lg:px-12 lg:py-14">
          <h2 className="text-xs font-bold uppercase tracking-wide text-white">Send a Message</h2>
          {sent ? (
            <div className="mt-8 border border-[#e3bb78]/40 bg-[#111110] px-5 py-8 text-center">
              <p className="text-sm font-semibold text-[#e3bb78]">Message received</p>
              <p className="mt-2 text-xs text-[#b5b0a8]">
                Thanks — we&apos;ll get back to you shortly.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-5 text-[11px] font-bold uppercase text-white underline underline-offset-2 hover:text-[#e3bb78]"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" name="name" required placeholder="Your name" />
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@email.com"
                />
              </div>
              <Field
                label="Subject"
                name="subject"
                required
                placeholder="Order, fit, partnership…"
              />
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#b5b0a8]">
                  Message
                </span>
                <textarea
                  name="message"
                  required
                  rows={5}
                  placeholder="How can we help?"
                  className="w-full resize-y rounded-[4px] border border-[#37332c] bg-[#1a1815] px-3.5 py-3 text-sm text-white outline-none placeholder:text-[#8b867d] focus:border-[#e3bb78] focus:ring-2 focus:ring-[#e3bb78]/15"
                />
              </label>
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="absolute left-[-9999px] h-0 w-0 opacity-0"
                aria-hidden="true"
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full border border-[#efc677] bg-[#e5bd79] py-3 text-xs font-bold uppercase tracking-[.08em] text-[#18120b] transition-colors hover:bg-[#eec98a] disabled:opacity-50 sm:w-auto sm:px-10"
              >
                {submitting ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#b5b0a8]">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-[4px] border border-[#37332c] bg-[#1a1815] px-3.5 py-3 text-sm text-white outline-none placeholder:text-[#8b867d] focus:border-[#e3bb78] focus:ring-2 focus:ring-[#e3bb78]/15"
      />
    </label>
  );
}

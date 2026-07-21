import Link from 'next/link';
import { Check, Headphones, Package, ShieldCheck } from 'lucide-react';

const BENEFITS = [
  { icon: Check, label: 'Easy returns within 7 days' },
  { icon: Package, label: 'Free exchange on eligible items' },
  { icon: ShieldCheck, label: 'Hassle-free replacement' },
  { icon: Headphones, label: 'Dedicated customer support' },
] as const;

export function EasyReturnsExchange() {
  return (
    <div className="mt-5 border-t border-[#E5E7EB] pt-5">
      <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#555555]">
        Easy Returns & Exchange
      </p>
      <div className="mt-3 rounded-[4px] border border-[#E5E7EB] bg-white px-3 py-3 sm:px-4">
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {BENEFITS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-[11px] text-[#555555]">
              <Icon
                className="size-3.5 shrink-0 text-green-700"
                strokeWidth={1.7}
                aria-hidden="true"
              />
              {label}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] leading-relaxed text-[#555555]">
          Items must be unworn with tags attached.{' '}
          <Link href="/returns" className="text-[#C9A227] hover:text-[#D4B03A]">
            View return policy
          </Link>
        </p>
      </div>
    </div>
  );
}

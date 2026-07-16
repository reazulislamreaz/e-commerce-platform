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
    <div className="mt-5 border-t border-[#2d2a27] pt-5">
      <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#b5b0a8]">
        Easy Returns & Exchange
      </p>
      <div className="mt-3 rounded-[4px] border border-[#2d2a27] bg-[#111110] px-3 py-3 sm:px-4">
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {BENEFITS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-[11px] text-[#e9e5de]">
              <Icon
                className="size-3.5 shrink-0 text-[#8fbf8f]"
                strokeWidth={1.7}
                aria-hidden="true"
              />
              {label}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] leading-relaxed text-[#8b867d]">
          Items must be unworn with tags attached.{' '}
          <Link href="/returns" className="text-[#e3bb78] hover:text-[#eec98a]">
            View return policy
          </Link>
        </p>
      </div>
    </div>
  );
}

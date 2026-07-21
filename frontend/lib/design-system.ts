/**
 * Elevate Apparel light design system — storefront tokens.
 * Prefer these literals in Tailwind classes for JIT compatibility.
 */
export const DS = {
  bg: '#FAFAFA',
  ink: '#111111',
  muted: '#555555',
  gold: '#C9A227',
  goldHover: '#D4B03A',
  border: '#E5E7EB',
  card: '#FFFFFF',
} as const;

/** Primary CTA: black fill → gold on hover */
export const btnPrimary =
  'inline-flex items-center justify-center rounded-[4px] border border-[#111111] bg-[#111111] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227] disabled:opacity-50';

/** Secondary CTA: white outline → black fill on hover */
export const btnSecondary =
  'inline-flex items-center justify-center rounded-[4px] border border-[#111111] bg-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227] disabled:opacity-50';

/** Soft card shell */
export const cardShell =
  'rounded-lg border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]';

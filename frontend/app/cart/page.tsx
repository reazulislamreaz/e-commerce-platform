import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cart',
  description: 'Your Elevate Apparel shopping bag.',
};

export default function CartPage() {
  return (
    <main id="main-content" className="flex flex-1 flex-col items-center justify-center bg-black px-5 py-20 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
        Shopping Bag
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-white">YOUR BAG IS EMPTY</h1>
      <p className="mt-3 max-w-sm text-sm text-[#b5b0a8]">
        Discover premium essentials and start elevating your everyday.
      </p>
      <Link
        href="/shop"
        className="mt-8 border border-[#efc677] bg-[#e5bd79] px-6 py-3 text-[11px] font-bold uppercase text-[#18120b] hover:bg-[#eec98a]"
      >
        Continue Shopping
      </Link>
    </main>
  );
}

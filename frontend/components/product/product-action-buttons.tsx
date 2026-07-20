'use client';

import { PhoneIcon, WhatsAppIcon } from '@/components/shared/contact-widget/icons';

const actionBtn =
  'inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[4px] px-2.5 py-3 text-[10px] font-bold uppercase leading-tight transition-[transform,background-color,border-color] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4 sm:text-[11px]';

type ProductActionButtonsProps = {
  inStock: boolean;
  productName: string;
  whatsappOrderHref: string;
  callOrderHref: string;
  onAddToBag: () => void;
  onOrderNow: () => void;
};

export function ProductActionButtons({
  inStock,
  productName,
  whatsappOrderHref,
  callOrderHref,
  onAddToBag,
  onOrderNow,
}: ProductActionButtonsProps) {
  const addToBagBtn = (
    <button
      type="button"
      disabled={!inStock}
      onClick={onAddToBag}
      className={`${actionBtn} border border-[#37332c] bg-[#111110] text-white hover:border-[#e3bb78] hover:bg-[#1a1815] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e3bb78] focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
    >
      {inStock ? 'Add to Bag' : 'Out of Stock'}
    </button>
  );

  const orderNowBtn = (
    <button
      type="button"
      disabled={!inStock}
      onClick={onOrderNow}
      className={`${actionBtn} border border-[#efc677] bg-[#e5bd79] text-[#18120b] hover:bg-[#eec98a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e3bb78] focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
    >
      Order Now
    </button>
  );

  const whatsappBtn = (
    <a
      href={whatsappOrderHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Order ${productName} on WhatsApp`}
      className={`${actionBtn} border border-[#1fa855] bg-[#25D366] text-white hover:bg-[#20bd5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e3bb78] focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
    >
      <WhatsAppIcon className="size-4 shrink-0" />
      WhatsApp Order
    </a>
  );

  const callBtn = (
    <a
      href={callOrderHref}
      aria-label={`Call to order ${productName}`}
      className={`${actionBtn} border border-[#37332c] bg-[#111110] text-white hover:border-[#e3bb78] hover:bg-[#1a1815] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e3bb78] focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
    >
      <PhoneIcon className="size-4 shrink-0 text-[#e3bb78]" />
      Call for Order
    </a>
  );

  return (
    <>
      {/* Mobile & tablet: 2×2 conversion grid */}
      <div className="mt-6 grid grid-cols-2 gap-2.5 lg:hidden">
        {addToBagBtn}
        {orderNowBtn}
        {whatsappBtn}
        {callBtn}
      </div>

      {/* Desktop: preserve existing two-row layout */}
      <div className="mt-6 hidden grid-cols-2 gap-2.5 lg:grid">
        {addToBagBtn}
        {orderNowBtn}
      </div>
      <div className="mt-2.5 hidden grid-cols-2 gap-2.5 lg:grid">
        {whatsappBtn}
        {callBtn}
      </div>
    </>
  );
}

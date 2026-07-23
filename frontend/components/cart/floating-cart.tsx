'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectCartCount } from '@/store/selectors';
import { useCartDetails } from '@/features/cart/hooks';
import { formatTaka } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { CartBadge } from './cart-badge';

interface FloatingCartProps {
  onOpen: () => void;
}

/**
 * Right-edge, vertically centered floating cart. Stays mounted (so it remains a
 * stable fly-to-cart target) but is only visible + focusable while the bag has
 * items. Bounces its badge whenever the item count grows.
 */
export const FloatingCart = forwardRef<HTMLButtonElement, FloatingCartProps>(function FloatingCart(
  { onOpen },
  ref,
) {
  const count = useAppSelector(selectCartCount);
  const { subtotal } = useCartDetails();
  const visible = count > 0;

  const [pulse, setPulse] = useState(false);
  const previousCount = useRef(count);

  useEffect(() => {
    if (count > previousCount.current) {
      setPulse(true);
      const timeout = setTimeout(() => setPulse(false), 480);
      previousCount.current = count;
      return () => clearTimeout(timeout);
    }
    previousCount.current = count;
  }, [count]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label={`Open shopping bag, ${count} item${count === 1 ? '' : 's'}`}
      className={cn(
        'group fixed right-3 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-[10px] border border-[#111111] bg-[#111111] px-3 py-3 text-white shadow-[0_12px_30px_rgba(0,0,0,.28)] outline-none transition-[transform,opacity,background-color,border-color,box-shadow] duration-300 ease-out hover:bg-[#C9A227] hover:text-[#111111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227] active:scale-95 sm:right-4',
        visible ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0',
      )}
    >
      <span className="relative">
        <ShoppingBag className="size-5" strokeWidth={1.7} aria-hidden="true" />
        <CartBadge
          count={count}
          pulse={pulse}
          className="absolute -right-2 -top-2 border border-[#FAFAFA] group-hover:border-[#C9A227]"
        />
      </span>
      {subtotal > 0 && (
        <span className="text-[10px] font-bold tabular-nums tracking-tight">
          {formatTaka(subtotal)}
        </span>
      )}
    </button>
  );
});

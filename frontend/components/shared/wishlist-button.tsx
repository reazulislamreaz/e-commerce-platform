'use client';

import { Heart } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { wishlistToggled } from '@/store/slices/wishlist-slice';
import { selectIsWishlisted } from '@/store/selectors';
import { cn } from '@/lib/utils';

export function WishlistButton({
  productId,
  className,
  variant = 'overlay',
}: {
  productId: string;
  className?: string;
  variant?: 'overlay' | 'button';
}) {
  const dispatch = useAppDispatch();
  const wishlisted = useAppSelector(selectIsWishlisted(productId));

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={() => dispatch(wishlistToggled(productId))}
        className={cn(
          'inline-flex items-center gap-2 border border-[#37332c] px-5 py-3 text-[11px] font-bold uppercase text-white hover:border-[#e3bb78] hover:text-[#e3bb78]',
          className,
        )}
      >
        <Heart
          className={`size-3.5 ${wishlisted ? 'fill-[#e3bb78] stroke-[#e3bb78]' : ''}`}
          strokeWidth={1.5}
        />
        Wishlist
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      onClick={(e) => {
        e.preventDefault();
        dispatch(wishlistToggled(productId));
      }}
      className={cn(
        'absolute right-2 top-2 rounded-full bg-white/80 p-1.5 transition-colors hover:bg-white',
        className,
      )}
    >
      <Heart
        className={`size-[15px] ${wishlisted ? 'fill-[#e3bb78] stroke-[#e3bb78]' : 'stroke-[#111]'}`}
        strokeWidth={1.5}
      />
    </button>
  );
}

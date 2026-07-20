'use client';

import { Heart } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { wishlistToggled } from '@/store/slices/wishlist-slice';
import { selectAuthUser, selectIsWishlisted } from '@/store/selectors';
import { addWishlistProduct, removeWishlistProduct } from '@/features/wishlist/api';
import { toast } from '@/lib/toast';
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
  const user = useAppSelector(selectAuthUser);

  const toggle = () => {
    const nextWishlisted = !wishlisted;
    dispatch(wishlistToggled(productId));
    if (nextWishlisted) {
      toast.success('Added to wishlist.', { dedupeKey: `wishlist:add:${productId}` });
    } else {
      toast.info('Removed from wishlist.', { dedupeKey: `wishlist:remove:${productId}` });
    }
    if (!user) return;
    void (nextWishlisted ? addWishlistProduct(productId) : removeWishlistProduct(productId)).catch(
      () => {
        dispatch(wishlistToggled(productId));
        toast.error('Could not update wishlist. Please try again.', {
          dedupeKey: 'wishlist:sync-error',
        });
      },
    );
  };

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={wishlisted}
        className={cn(
          'inline-flex w-full items-center justify-center gap-2 rounded-[4px] border border-[#37332c] bg-[#111110] px-4 py-3 text-[11px] font-bold uppercase text-white transition-colors hover:border-[#e3bb78] hover:bg-[#1a1815] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e3bb78] focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          wishlisted && 'border-[#e3bb78]/60 text-[#e3bb78]',
          className,
        )}
      >
        <Heart
          className={cn('size-4 shrink-0', wishlisted && 'fill-[#e3bb78] stroke-[#e3bb78]')}
          strokeWidth={1.5}
        />
        {wishlisted ? 'In Wishlist' : 'Add to Wishlist'}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={wishlisted}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      className={cn(
        'absolute right-3 top-3 z-10 flex size-10 items-center justify-center rounded-full border border-[#37332c]/50 bg-[#111110]/85 text-white shadow-[0_4px_14px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-[#e3bb78]/60 hover:bg-[#111110] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e3bb78] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:size-11',
        className,
      )}
    >
      <Heart
        className={cn(
          'size-4 transition-colors sm:size-[18px]',
          wishlisted ? 'fill-[#e3bb78] stroke-[#e3bb78]' : 'stroke-white',
        )}
        strokeWidth={1.5}
      />
    </button>
  );
}

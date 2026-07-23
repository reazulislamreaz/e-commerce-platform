'use client';

import { Heart } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { wishlistToggled } from '@/store/slices/wishlist-slice';
import { selectAuthUser, selectIsWishlisted } from '@/store/selectors';
import { addWishlistProduct, removeWishlistProduct } from '@/features/wishlist/api';
import { addPendingWishlist } from '@/features/wishlist/pending';
import { loginHref } from '@/lib/auth-redirect';
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
  const router = useRouter();
  const pathname = usePathname();
  const wishlisted = useAppSelector(selectIsWishlisted(productId));
  const user = useAppSelector(selectAuthUser);

  const toggle = () => {
    // Guests: never save before authenticating. Remember the intended product,
    // send them to login preserving the current page, and complete the add
    // automatically after a successful sign-in.
    if (!user) {
      addPendingWishlist(productId);
      const search = typeof window !== 'undefined' ? window.location.search : '';
      toast.info('Please sign in to save items to your wishlist.', {
        dedupeKey: 'wishlist:auth',
      });
      router.push(loginHref(`${pathname}${search}`, 'wishlist'));
      return;
    }

    const nextWishlisted = !wishlisted;
    dispatch(wishlistToggled(productId));
    if (nextWishlisted) {
      toast.success('Added to wishlist.', { dedupeKey: `wishlist:add:${productId}` });
    } else {
      toast.info('Removed from wishlist.', { dedupeKey: `wishlist:remove:${productId}` });
    }
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
          'inline-flex w-full items-center justify-center gap-2 rounded-[4px] border border-[#E5E7EB] bg-white px-4 py-3 text-[11px] font-bold uppercase text-[#111111] transition-colors hover:border-[#C9A227] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAFA]',
          wishlisted && 'border-[#C9A227]/60 text-[#C9A227]',
          className,
        )}
      >
        <Heart
          className={cn('size-4 shrink-0', wishlisted && 'fill-[#C9A227] stroke-[#C9A227]')}
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
        'absolute right-3 top-3 z-10 flex size-10 items-center justify-center rounded-full border border-[#E5E7EB]/50 bg-white/85 text-[#111111] shadow-[0_4px_14px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-[#C9A227]/60 hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:size-11',
        className,
      )}
    >
      <Heart
        className={cn(
          'size-4 transition-colors sm:size-[18px]',
          wishlisted ? 'fill-[#C9A227] stroke-[#C9A227]' : 'stroke-current',
        )}
        strokeWidth={1.5}
      />
    </button>
  );
}

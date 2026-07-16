'use client';

import { useEffect, type PropsWithChildren } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { authHydrated } from '@/store/slices/auth-slice';
import { cartHydrated, type CartItem } from '@/store/slices/cart-slice';
import { wishlistHydrated } from '@/store/slices/wishlist-slice';
import { recentlyViewedHydrated } from '@/store/slices/recently-viewed-slice';
import { readStorage, writeStorage, removeStorage } from '@/lib/storage';
import type { AuthUser } from '@/types/auth';

type PersistedAuth = {
  accessToken: string | null;
  user: AuthUser | null;
  rememberMe: boolean;
};

export function StoreHydrator({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((s) => s.auth);
  const cart = useAppSelector((s) => s.cart);
  const wishlist = useAppSelector((s) => s.wishlist);
  const recentlyViewed = useAppSelector((s) => s.recentlyViewed);

  useEffect(() => {
    const persistedAuth = readStorage<PersistedAuth>('auth', {
      accessToken: null,
      user: null,
      rememberMe: true,
    });
    dispatch(authHydrated(persistedAuth));
    dispatch(cartHydrated(readStorage<CartItem[]>('cart', [])));
    dispatch(wishlistHydrated(readStorage<string[]>('wishlist', [])));
    dispatch(recentlyViewedHydrated(readStorage<string[]>('recentlyViewed', [])));
  }, [dispatch]);

  useEffect(() => {
    if (!auth.hydrated) return;
    if (auth.accessToken && auth.user) {
      writeStorage('auth', {
        accessToken: auth.accessToken,
        user: auth.user,
        rememberMe: auth.rememberMe,
      });
    } else {
      removeStorage('auth');
    }
  }, [auth]);

  useEffect(() => {
    if (!cart.hydrated) return;
    writeStorage('cart', cart.items);
  }, [cart]);

  useEffect(() => {
    if (!wishlist.hydrated) return;
    writeStorage('wishlist', wishlist.productIds);
  }, [wishlist]);

  useEffect(() => {
    if (!recentlyViewed.hydrated) return;
    writeStorage('recentlyViewed', recentlyViewed.productIds);
  }, [recentlyViewed]);

  return children;
}

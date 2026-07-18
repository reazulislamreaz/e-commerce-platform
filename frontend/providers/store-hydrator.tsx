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

function readAuth(): PersistedAuth {
  const fromLocal = readStorage<PersistedAuth | null>('auth', null);
  if (fromLocal?.accessToken) return { ...fromLocal, rememberMe: true };

  if (typeof window === 'undefined') {
    return { accessToken: null, user: null, rememberMe: true };
  }
  try {
    const raw = sessionStorage.getItem('elevate:auth-session');
    if (!raw) return { accessToken: null, user: null, rememberMe: false };
    const parsed = JSON.parse(raw) as PersistedAuth;
    return { ...parsed, rememberMe: false };
  } catch {
    return { accessToken: null, user: null, rememberMe: false };
  }
}

function setAuthHintCookie(enabled: boolean) {
  if (typeof document === 'undefined') return;
  if (enabled) {
    document.cookie = 'elevate_auth_hint=1; Path=/; SameSite=Lax; Max-Age=2592000';
  } else {
    document.cookie = 'elevate_auth_hint=; Path=/; SameSite=Lax; Max-Age=0';
  }
}

function persistAuth(auth: {
  accessToken: string | null;
  user: AuthUser | null;
  rememberMe: boolean;
}) {
  if (!auth.accessToken || !auth.user) {
    removeStorage('auth');
    if (typeof window !== 'undefined') sessionStorage.removeItem('elevate:auth-session');
    setAuthHintCookie(false);
    return;
  }

  const payload: PersistedAuth = {
    accessToken: auth.accessToken,
    user: auth.user,
    rememberMe: auth.rememberMe,
  };

  setAuthHintCookie(true);

  if (auth.rememberMe) {
    writeStorage('auth', payload);
    if (typeof window !== 'undefined') sessionStorage.removeItem('elevate:auth-session');
  } else {
    removeStorage('auth');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('elevate:auth-session', JSON.stringify(payload));
    }
  }
}

export function StoreHydrator({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((s) => s.auth);
  const cartItems = useAppSelector((s) => s.cart.items);
  const cartHydratedFlag = useAppSelector((s) => s.cart.hydrated);
  const wishlistIds = useAppSelector((s) => s.wishlist.productIds);
  const wishlistHydratedFlag = useAppSelector((s) => s.wishlist.hydrated);
  const recentIds = useAppSelector((s) => s.recentlyViewed.productIds);
  const recentHydratedFlag = useAppSelector((s) => s.recentlyViewed.hydrated);

  useEffect(() => {
    dispatch(authHydrated(readAuth()));
    dispatch(cartHydrated(readStorage<CartItem[]>('cart', [])));
    dispatch(wishlistHydrated(readStorage<string[]>('wishlist', [])));
    dispatch(recentlyViewedHydrated(readStorage<string[]>('recentlyViewed', [])));
  }, [dispatch]);

  useEffect(() => {
    if (!auth.hydrated) return;
    persistAuth({
      accessToken: auth.accessToken,
      user: auth.user,
      rememberMe: auth.rememberMe,
    });
  }, [auth.hydrated, auth.accessToken, auth.user, auth.rememberMe]);

  useEffect(() => {
    if (!cartHydratedFlag) return;
    writeStorage('cart', cartItems);
  }, [cartHydratedFlag, cartItems]);

  useEffect(() => {
    if (!wishlistHydratedFlag) return;
    writeStorage('wishlist', wishlistIds);
  }, [wishlistHydratedFlag, wishlistIds]);

  useEffect(() => {
    if (!recentHydratedFlag) return;
    writeStorage('recentlyViewed', recentIds);
  }, [recentHydratedFlag, recentIds]);

  return children;
}

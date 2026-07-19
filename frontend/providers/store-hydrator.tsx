'use client';

import { useEffect, useRef, type PropsWithChildren } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { authHydrated } from '@/store/slices/auth-slice';
import { cartHydrated, type CartItem } from '@/store/slices/cart-slice';
import { wishlistHydrated } from '@/store/slices/wishlist-slice';
import { recentlyViewedHydrated } from '@/store/slices/recently-viewed-slice';
import { mergeServerCart, toReduxCartItems } from '@/features/cart/api';
import { mergeWishlist } from '@/features/wishlist/api';
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
  const commerceSyncedForUser = useRef<string | null>(null);

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

  // Reconcile cart + wishlist with the server after a signed-in session is restored
  // (login merge already covers fresh sign-in).
  useEffect(() => {
    if (!auth.hydrated || !wishlistHydratedFlag || !cartHydratedFlag) return;
    if (!auth.accessToken || !auth.user) {
      commerceSyncedForUser.current = null;
      return;
    }
    if (commerceSyncedForUser.current === auth.user.id) return;

    let cancelled = false;
    commerceSyncedForUser.current = auth.user.id;

    void (async () => {
      let failed = false;
      try {
        const cart = await mergeServerCart();
        if (!cancelled) dispatch(cartHydrated(toReduxCartItems(cart)));
      } catch {
        failed = true;
      }
      try {
        const productIds = await mergeWishlist(readStorage<string[]>('wishlist', []));
        if (!cancelled) dispatch(wishlistHydrated(productIds));
      } catch {
        failed = true;
      }
      if (failed && !cancelled) {
        commerceSyncedForUser.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    auth.hydrated,
    auth.accessToken,
    auth.user,
    wishlistHydratedFlag,
    cartHydratedFlag,
    dispatch,
  ]);

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

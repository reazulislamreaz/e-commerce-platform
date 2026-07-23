import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
import { selectCartCount } from '@/store/slices/cart-slice';

export { selectCartCount };

export const selectCartItems = (state: RootState) => state.cart.items;
export const selectCartHydrated = (state: RootState) => state.cart.hydrated;

export const selectWishlistIds = (state: RootState) => state.wishlist.productIds;
export const selectWishlistHydrated = (state: RootState) => state.wishlist.hydrated;
export const selectWishlistCount = createSelector(selectWishlistIds, (ids) => ids.length);
/**
 * Memoized id lookup — rebuilt only when the wishlist changes, so per-card
 * membership checks stay O(1) instead of scanning the array on every dispatch.
 */
export const selectWishlistIdSet = createSelector(selectWishlistIds, (ids) => new Set(ids));
export const selectIsWishlisted = (productId: string) => (state: RootState) =>
  selectWishlistIdSet(state).has(productId);

export const selectAuthUser = (state: RootState) => state.auth.user;
export const selectAuthHydrated = (state: RootState) => state.auth.hydrated;
export const selectIsAuthenticated = (state: RootState) => Boolean(state.auth.user);

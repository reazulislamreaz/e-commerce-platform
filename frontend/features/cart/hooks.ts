'use client';

import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { itemAdded, itemQuantitySet, itemRemoved, type CartItem } from '@/store/slices/cart-slice';
import { selectCartHydrated, selectCartItems } from '@/store/selectors';
import { toast } from '@/lib/toast';
import { useProductsByIds } from '@/features/products';
import { cartSubtotal, resolveCartLines, shippingForSubtotal } from './pricing';

function warnCartSync() {
  toast.warning('Could not sync bag. Changes saved on this device.', { dedupeKey: 'cart:sync' });
}

/**
 * Single source of truth for cart write operations: optimistic Redux update +
 * best-effort server sync + on-brand toast feedback. Reused by the product
 * detail page, cart page, and slide-out drawer so cart logic never forks.
 */
export function useCartMutations() {
  const dispatch = useAppDispatch();

  const addItem = useCallback(
    (input: CartItem & { name?: string; notify?: boolean }) => {
      const { name, notify = true, ...item } = input;
      dispatch(itemAdded(item));
      void import('@/features/cart/api').then(({ upsertServerCartItem }) =>
        upsertServerCartItem(item.variantId, item.quantity).catch(warnCartSync),
      );
      if (notify && name) {
        toast.success(`${name} added to your bag.`, { dedupeKey: `cart:add:${item.productId}` });
      }
    },
    [dispatch],
  );

  const setItemQuantity = useCallback(
    (input: { productId: string; variantId: string; quantity: number }) => {
      dispatch(itemQuantitySet(input));
      void import('@/features/cart/api').then(({ setServerCartItemQuantity }) =>
        setServerCartItemQuantity(input.variantId, input.quantity).catch(warnCartSync),
      );
    },
    [dispatch],
  );

  const removeItem = useCallback(
    (input: { productId: string; variantId: string; name?: string }) => {
      dispatch(itemRemoved({ productId: input.productId, variantId: input.variantId }));
      if (input.name) {
        toast.info(`${input.name} removed from your bag.`, {
          dedupeKey: `cart:remove:${input.variantId}`,
        });
      }
      void import('@/features/cart/api').then(({ removeServerCartItem }) =>
        removeServerCartItem(input.variantId).catch(warnCartSync),
      );
    },
    [dispatch],
  );

  return { addItem, setItemQuantity, removeItem };
}

/**
 * Resolves the Redux cart into priced lines with derived totals. Shares the
 * cached `by-ids` catalog query with the cart page, so mounting the floating
 * cart / drawer adds no extra network cost.
 */
export function useCartDetails() {
  const items = useAppSelector(selectCartItems);
  const hydrated = useAppSelector(selectCartHydrated);
  const productsQuery = useProductsByIds(
    items.map((item) => item.productId),
    hydrated,
  );

  const lines = useMemo(
    () => resolveCartLines(items, productsQuery.data ?? []),
    [items, productsQuery.data],
  );
  const subtotal = useMemo(() => cartSubtotal(lines), [lines]);
  const shipping = shippingForSubtotal(subtotal);
  const total = subtotal + shipping;
  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  return { items, hydrated, lines, subtotal, shipping, total, totalItems, productsQuery };
}

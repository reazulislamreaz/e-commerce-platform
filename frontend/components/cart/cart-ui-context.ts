'use client';

import { createContext, useContext } from 'react';

export interface FlyOrigin {
  /** Bounding rect of the source element (usually the product image). */
  rect: DOMRect;
  imageSrc: string;
}

export interface CartUiContextValue {
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  /** Launches the fly-to-cart micro-interaction toward the floating cart. */
  flyToCart: (origin: FlyOrigin) => void;
}

export const CartUiContext = createContext<CartUiContextValue | null>(null);

export function useCartUi(): CartUiContextValue {
  const context = useContext(CartUiContext);
  if (!context) {
    throw new Error('useCartUi must be used within a CartUiProvider');
  }
  return context;
}

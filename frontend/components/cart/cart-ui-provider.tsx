'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { CartUiContext, type FlyOrigin } from './cart-ui-context';
import { FloatingCart } from './floating-cart';
import { prefersReducedMotion, runFlyToCart } from './fly-to-cart';

// The drawer bundle only loads once the shopper opens the cart, keeping it off
// the critical path for first paint / Core Web Vitals.
const CartDrawer = dynamic(() => import('./cart-drawer').then((mod) => mod.CartDrawer), {
  ssr: false,
});

/**
 * Owns storefront cart UI: the floating cart, the slide-out drawer, and the
 * fly-to-cart animation layer. Exposes imperative helpers via context so pages
 * (e.g. product detail) can trigger the interaction without prop drilling.
 */
export function CartUiProvider({ children }: PropsWithChildren) {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const floatingCartRef = useRef<HTMLButtonElement>(null);
  const flyLayerRef = useRef<HTMLDivElement>(null);

  const openDrawer = useCallback(() => {
    setDrawerMounted(true);
    setDrawerOpen(true);
  }, []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => {
    setDrawerMounted(true);
    setDrawerOpen((value) => !value);
  }, []);

  const flyToCart = useCallback((origin: FlyOrigin) => {
    if (prefersReducedMotion()) return;
    const target = floatingCartRef.current;
    const container = flyLayerRef.current;
    if (!target || !container) return;
    runFlyToCart({
      originRect: origin.rect,
      targetRect: target.getBoundingClientRect(),
      imageSrc: origin.imageSrc,
      container,
    });
  }, []);

  const value = useMemo(
    () => ({ isDrawerOpen, openDrawer, closeDrawer, toggleDrawer, flyToCart }),
    [isDrawerOpen, openDrawer, closeDrawer, toggleDrawer, flyToCart],
  );

  return (
    <CartUiContext.Provider value={value}>
      {children}
      <div
        ref={flyLayerRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[85]"
      />
      <FloatingCart ref={floatingCartRef} onOpen={openDrawer} />
      {drawerMounted && <CartDrawer open={isDrawerOpen} onClose={closeDrawer} />}
    </CartUiContext.Provider>
  );
}

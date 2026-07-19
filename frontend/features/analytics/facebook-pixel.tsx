'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMarketingConsent } from './use-marketing-consent';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const PURCHASE_TRACKED_PREFIX = 'elevate:pixel:purchase:';

let globalCanTrack = false;

function trackEvent(event: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  if (params) window.fbq('track', event, params);
  else window.fbq('track', event);
}

function trackIfAllowed(event: string, params?: Record<string, unknown>): void {
  if (!globalCanTrack) return;
  trackEvent(event, params);
}

export function trackViewContent(params: {
  content_ids: string[];
  content_name: string;
  content_type?: string;
  value?: number;
  currency?: string;
}): void {
  trackIfAllowed('ViewContent', { content_type: 'product', currency: 'BDT', ...params });
}

export function trackAddToCart(params: {
  content_ids: string[];
  content_name: string;
  value: number;
  currency?: string;
}): void {
  trackIfAllowed('AddToCart', { content_type: 'product', currency: 'BDT', ...params });
}

export function trackInitiateCheckout(params: {
  content_ids: string[];
  num_items: number;
  value: number;
  currency?: string;
}): void {
  trackIfAllowed('InitiateCheckout', { currency: 'BDT', ...params });
}

export function trackPurchase(params: {
  content_ids: string[];
  value: number;
  currency?: string;
  order_id?: string;
}): void {
  if (!globalCanTrack) return;

  const orderId = params.order_id?.trim();
  if (orderId && typeof window !== 'undefined') {
    const key = PURCHASE_TRACKED_PREFIX + orderId;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // ignore quota errors
    }
  }

  trackEvent('Purchase', { currency: 'BDT', ...params });
}

function PixelPageView({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (!enabled) return;
    trackEvent('PageView');
  }, [enabled, pathname, searchParams]);

  return null;
}

/** Syncs consent state for imperative pixel helpers used outside this component. */
export function MarketingConsentBridge() {
  const { canTrack } = useMarketingConsent();

  useEffect(() => {
    globalCanTrack = canTrack;
    return () => {
      globalCanTrack = false;
    };
  }, [canTrack]);

  return null;
}

/** Loads Facebook Pixel only when configured and marketing consent allows tracking. */
export function FacebookPixel() {
  const { canTrack, pixelId } = useMarketingConsent();
  if (!pixelId || !canTrack) return null;

  return (
    <>
      <Script id="facebook-pixel" strategy="afterInteractive">
        {`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(pixelId)});
fbq('track', 'PageView');
        `}
      </Script>
      <PixelPageView enabled={canTrack} />
    </>
  );
}

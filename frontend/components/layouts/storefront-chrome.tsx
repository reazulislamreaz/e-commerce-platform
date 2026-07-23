'use client';

import { usePathname } from 'next/navigation';
import type { PropsWithChildren } from 'react';
import { SiteHeader } from '@/components/layouts/site-header';
import { SiteFooter } from '@/components/layouts/site-footer';
import { MobileBottomNav } from '@/components/layouts/mobile-bottom-nav';
import { ContactWidgetLazy } from '@/components/shared/contact-widget/contact-widget-lazy';
import { CartUiProvider } from '@/components/cart/cart-ui-provider';

export function StorefrontChrome({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <CartUiProvider>
      <SiteHeader />
      {children}
      <SiteFooter />
      <MobileBottomNav />
      <ContactWidgetLazy />
    </CartUiProvider>
  );
}

'use client';

import dynamic from 'next/dynamic';

export const ContactWidgetLazy = dynamic(
  () => import('./contact-widget').then((mod) => mod.ContactWidget),
  { ssr: false },
);

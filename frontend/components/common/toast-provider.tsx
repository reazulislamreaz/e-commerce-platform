'use client';

import dynamic from 'next/dynamic';

const ToastHost = dynamic(
  () => import('@/components/common/toast-host').then((mod) => mod.ToastHost),
  { ssr: false },
);

/** Lazy-loaded global toast surface — mount once inside AppProviders. */
export function ToastProvider() {
  return <ToastHost />;
}

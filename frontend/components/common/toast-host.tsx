'use client';

import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  dismissToast,
  pauseToast,
  resumeToast,
  subscribeToasts,
  type ToastRecord,
  type ToastVariant,
} from '@/lib/toast/store';

const VARIANT_STYLES: Record<
  ToastVariant,
  { border: string; accent: string; bg: string; icon: typeof CheckCircle2 }
> = {
  success: {
    border: 'border-green-200',
    accent: 'text-green-700',
    bg: 'bg-green-50',
    icon: CheckCircle2,
  },
  error: {
    border: 'border-red-200',
    accent: 'text-red-700',
    bg: 'bg-red-50',
    icon: AlertCircle,
  },
  warning: {
    border: 'border-[#E8D9A8]',
    accent: 'text-[#C9A227]',
    bg: 'bg-[#FFF8E7]',
    icon: AlertTriangle,
  },
  info: {
    border: 'border-blue-200',
    accent: 'text-blue-700',
    bg: 'bg-blue-50',
    icon: Info,
  },
};

const ToastItem = memo(function ToastItem({ toast }: { toast: ToastRecord }) {
  const styles = VARIANT_STYLES[toast.variant];
  const Icon = styles.icon;

  return (
    <li
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-dismissing={toast.dismissing ? 'true' : undefined}
      onMouseEnter={() => pauseToast(toast.id)}
      onMouseLeave={() => resumeToast(toast.id)}
      onFocus={() => pauseToast(toast.id)}
      onBlur={() => resumeToast(toast.id)}
      className={cn(
        'pointer-events-auto flex w-full max-w-[min(92vw,380px)] items-start gap-3 rounded-[4px] border px-3.5 py-3 text-[13px] text-[#111111] shadow-[0_8px_30px_-12px_rgba(0,0,0,.2)] backdrop-blur-sm',
        'motion-safe:animate-[toast-in_220ms_cubic-bezier(.21,1.02,.73,1)_both]',
        'data-[dismissing=true]:motion-safe:animate-[toast-out_180ms_ease-in_both]',
        'will-change-[transform,opacity]',
        styles.bg,
        styles.border,
      )}
    >
      <Icon
        className={cn('mt-0.5 size-4 shrink-0', styles.accent)}
        strokeWidth={1.75}
        aria-hidden
      />
      <p className="min-w-0 flex-1 leading-snug">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => dismissToast(toast.id)}
        className="shrink-0 rounded-[4px] p-0.5 text-[#555555] transition-colors hover:text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]/40"
      >
        <X className="size-3.5" strokeWidth={1.75} />
      </button>
    </li>
  );
});

export function ToastHost({ className }: { className?: string }) {
  const [items, setItems] = useState<readonly ToastRecord[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className={cn(
        'pointer-events-none fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-[80] flex flex-col gap-2 md:bottom-6 md:right-6',
        className,
      )}
    >
      <ul className="flex flex-col gap-2">
        {items.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </ul>
    </div>
  );
}

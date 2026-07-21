import { dismissAllToasts, dismissToast, pushToast, type ToastOptions } from './store';
import { getUserFacingErrorMessage } from '@/lib/user-facing-error';

export type { ToastOptions, ToastRecord, ToastVariant } from './store';
export { dismissAllToasts, dismissToast, getToasts, subscribeToasts } from './store';

function show(message: string, options?: ToastOptions): string {
  return pushToast(message, options);
}

export const toast = Object.assign(show, {
  success(message: string, options?: Omit<ToastOptions, 'variant'>) {
    return pushToast(message, { ...options, variant: 'success' });
  },
  error(message: string, options?: Omit<ToastOptions, 'variant'>) {
    return pushToast(message, { ...options, variant: 'error' });
  },
  warning(message: string, options?: Omit<ToastOptions, 'variant'>) {
    return pushToast(message, { ...options, variant: 'warning' });
  },
  info(message: string, options?: Omit<ToastOptions, 'variant'>) {
    return pushToast(message, { ...options, variant: 'info' });
  },
  dismiss: dismissToast,
  dismissAll: dismissAllToasts,
});

/** Extract a user-facing message from an API or network error. */
export function toastFromError(error: unknown, fallback: string): string {
  return getUserFacingErrorMessage(error, fallback);
}

/** Show an error toast from a caught exception. */
export function toastErrorFrom(error: unknown, fallback: string, dedupeKey?: string): string {
  return toast.error(toastFromError(error, fallback), { dedupeKey });
}

/** @deprecated Use `toast()` from `@/lib/toast` instead. */
export function flashMessage(message: string, durationMs = 3200): string {
  return toast.info(message, { duration: durationMs });
}

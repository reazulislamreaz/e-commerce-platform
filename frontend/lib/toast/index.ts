import axios from 'axios';
import { dismissAllToasts, dismissToast, pushToast, type ToastOptions } from './store';

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
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Network error. Check your connection and try again.';
    }
    const data = error.response.data as { message?: string } | undefined;
    if (data?.message) return data.message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Show an error toast from a caught exception. */
export function toastErrorFrom(error: unknown, fallback: string, dedupeKey?: string): string {
  return toast.error(toastFromError(error, fallback), { dedupeKey });
}

/** @deprecated Use `toast()` from `@/lib/toast` instead. */
export function flashMessage(message: string, durationMs = 3200): string {
  return toast.info(message, { duration: durationMs });
}

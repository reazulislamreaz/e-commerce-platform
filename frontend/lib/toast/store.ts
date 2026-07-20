export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export type ToastRecord = {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  createdAt: number;
  dedupeKey?: string;
  dismissing?: boolean;
};

export type ToastOptions = {
  variant?: ToastVariant;
  duration?: number;
  /** When set, replaces an existing toast with the same key instead of stacking duplicates. */
  dedupeKey?: string;
};

type ToastListener = (toasts: readonly ToastRecord[]) => void;

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 3200,
  error: 5200,
  warning: 4200,
  info: 3200,
};

const MAX_VISIBLE = 3;
const DISMISS_ANIM_MS = 180;
const DEDUPE_WINDOW_MS = 1800;

let toasts: ToastRecord[] = [];
const listeners = new Set<ToastListener>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const expiresAt = new Map<string, number>();
const paused = new Set<string>();
const remainingOnPause = new Map<string, number>();
const recentDedupe = new Map<string, number>();

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `toast-${idCounter}`;
}

function emit(): void {
  const snapshot = toasts;
  listeners.forEach((listener) => listener(snapshot));
}

function clearTimer(id: string): void {
  const timer = timers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

function scheduleDismiss(id: string, delayMs: number): void {
  clearTimer(id);
  if (delayMs <= 0) {
    dismissToast(id);
    return;
  }
  const deadline = Date.now() + delayMs;
  expiresAt.set(id, deadline);
  timers.set(
    id,
    setTimeout(() => {
      dismissToast(id);
    }, delayMs),
  );
}

function markDismissing(id: string): void {
  toasts = toasts.map((toast) => (toast.id === id ? { ...toast, dismissing: true } : toast));
  emit();
  clearTimer(id);
  expiresAt.delete(id);
  paused.delete(id);
  remainingOnPause.delete(id);
  setTimeout(() => {
    toasts = toasts.filter((toast) => toast.id !== id);
    emit();
  }, DISMISS_ANIM_MS);
}

export function dismissToast(id: string): void {
  const toast = toasts.find((entry) => entry.id === id);
  if (!toast || toast.dismissing) return;
  markDismissing(id);
}

export function dismissAllToasts(): void {
  [...toasts].forEach((toast) => dismissToast(toast.id));
}

export function pauseToast(id: string): void {
  const toast = toasts.find((entry) => entry.id === id);
  if (!toast || toast.dismissing || paused.has(id)) return;
  const deadline = expiresAt.get(id);
  if (deadline === undefined) return;
  clearTimer(id);
  remainingOnPause.set(id, Math.max(0, deadline - Date.now()));
  paused.add(id);
}

export function resumeToast(id: string): void {
  if (!paused.has(id)) return;
  paused.delete(id);
  const toast = toasts.find((entry) => entry.id === id);
  if (!toast || toast.dismissing) return;
  const remaining = remainingOnPause.get(id) ?? 0;
  remainingOnPause.delete(id);
  scheduleDismiss(id, remaining);
}

export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): readonly ToastRecord[] {
  return toasts;
}

export function pushToast(message: string, options: ToastOptions = {}): string {
  const variant = options.variant ?? 'info';
  const duration = options.duration ?? DEFAULT_DURATIONS[variant];
  const dedupeKey = options.dedupeKey ?? `${variant}:${message}`;
  const now = Date.now();

  const lastShown = recentDedupe.get(dedupeKey);
  if (lastShown !== undefined && now - lastShown < DEDUPE_WINDOW_MS) {
    const existing = toasts.find((toast) => toast.dedupeKey === dedupeKey && !toast.dismissing);
    if (existing) {
      recentDedupe.set(dedupeKey, now);
      toasts = toasts.map((toast) =>
        toast.id === existing.id
          ? { ...toast, message, variant, duration, createdAt: now, dismissing: false }
          : toast,
      );
      paused.delete(existing.id);
      scheduleDismiss(existing.id, duration);
      emit();
      return existing.id;
    }
  }

  recentDedupe.set(dedupeKey, now);

  const id = nextId();
  const record: ToastRecord = {
    id,
    message,
    variant,
    duration,
    createdAt: now,
    dedupeKey,
  };

  toasts = [record, ...toasts].slice(0, MAX_VISIBLE);
  scheduleDismiss(id, duration);
  emit();
  return id;
}

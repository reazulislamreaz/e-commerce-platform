'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const listeners = new Set<(message: string | null) => void>();
let current: string | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

export function flashMessage(message: string, durationMs = 2400) {
  current = message;
  listeners.forEach((listener) => listener(current));
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    listeners.forEach((listener) => listener(null));
  }, durationMs);
}

/** Lightweight non-blocking notice for optimistic rollback / sync feedback. */
export function FlashMessageHost({ className }: { className?: string }) {
  const [message, setMessage] = useState<string | null>(current);

  useEffect(() => {
    listeners.add(setMessage);
    return () => {
      listeners.delete(setMessage);
    };
  }, []);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-[80] max-w-[min(92vw,360px)] -translate-x-1/2 rounded-[4px] border border-[#37332c] bg-[#111110]/95 px-4 py-2.5 text-center text-[12px] font-medium text-[#eee9e1] shadow-[0_12px_40px_-12px_rgba(0,0,0,.7)] backdrop-blur-sm md:bottom-6',
        className,
      )}
    >
      {message}
    </div>
  );
}

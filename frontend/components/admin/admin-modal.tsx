'use client';

import { useEffect, useId, useRef, type PropsWithChildren, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const sizeStyles = {
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
} as const;

type AdminModalProps = PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: keyof typeof sizeStyles;
  /** Sticky footer content — usually the action buttons. */
  footer?: ReactNode;
  /** Blocks backdrop/escape/X dismissal while a mutation is in flight. */
  dismissDisabled?: boolean;
}>;

export function AdminModal({
  open,
  onClose,
  title,
  description,
  size = 'lg',
  footer,
  dismissDisabled = false,
  children,
}: AdminModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !dismissDisabled) onClose();
    }
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [open, onClose, dismissDisabled]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={() => !dismissDisabled && onClose()}
        className="absolute inset-0 animate-[admin-fade-in_.15s_ease-out] cursor-default bg-black/70 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full animate-[admin-modal-in_.18s_ease-out] flex-col overflow-hidden rounded-t-xl border border-[#26231f] bg-[#111110] shadow-[0_24px_80px_-24px_rgba(0,0,0,.9)] outline-none sm:rounded-xl',
          sizeStyles[size],
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#26231f] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-[13px] font-bold uppercase tracking-[.12em] text-white"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-[#b5b0a8]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => !dismissDisabled && onClose()}
            disabled={dismissDisabled}
            aria-label="Close dialog"
            className="rounded-lg border border-transparent p-1.5 text-[#b5b0a8] transition-colors hover:border-[#37332c] hover:bg-white/[0.04] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3bb78] disabled:opacity-50"
          >
            <X className="size-4" strokeWidth={1.7} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[#26231f] bg-[#141312] px-5 py-4 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

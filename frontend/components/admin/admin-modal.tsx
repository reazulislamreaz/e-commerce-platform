'use client';

import {
  useEffect,
  useId,
  useRef,
  useLayoutEffect,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
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

  // Keep the latest onClose and dismissDisabled in refs so that the effects
  // below can always call the current version without being listed as
  // dependencies — preventing the effects from re-running (and re-focusing
  // the panel) on every parent re-render caused by form field state updates.
  // Refs are only read inside effects/handlers, never during the render phase.
  const onCloseRef = useRef(onClose);
  const dismissDisabledRef = useRef(dismissDisabled);

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    dismissDisabledRef.current = dismissDisabled;
  }, [onClose, dismissDisabled]);

  // Effect 1: focus the panel and lock body scroll when the modal opens.
  // Depends only on `open` so it never re-runs due to callback identity changes.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [open]);

  // Effect 2: keyboard listener — registered once per modal-open cycle.
  // Reads refs inside the handler so it always has the latest values without
  // needing them as dependencies.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !dismissDisabledRef.current) {
        onCloseRef.current();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

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
        className="absolute inset-0 animate-[admin-fade-in_.15s_ease-out] cursor-default bg-[#111111]/40 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full animate-[admin-modal-in_.18s_ease-out] flex-col overflow-hidden rounded-t-xl border border-[#E5E7EB] bg-[#FFFFFF] shadow-[0_24px_80px_-24px_rgba(0,0,0,.2)] outline-none sm:rounded-xl',
          sizeStyles[size],
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E5E7EB] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-[13px] font-bold uppercase tracking-[.12em] text-[#111111]"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-[#555555]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => !dismissDisabled && onClose()}
            disabled={dismissDisabled}
            aria-label="Close dialog"
            className="rounded-lg border border-transparent p-1.5 text-[#555555] transition-colors hover:border-[#E5E7EB] hover:bg-[#FAFAFA] hover:text-[#111111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227] disabled:opacity-50"
          >
            <X className="size-4" strokeWidth={1.7} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[#E5E7EB] bg-[#FAFAFA] px-5 py-4 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

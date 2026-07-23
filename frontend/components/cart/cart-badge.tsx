'use client';

import { cn } from '@/lib/utils';

interface CartBadgeProps {
  count: number;
  /** Replays the pop animation when toggled true. */
  pulse?: boolean;
  className?: string;
}

/** Reusable gold cart count badge with an optional bounce on new items. */
export function CartBadge({ count, pulse = false, className }: CartBadgeProps) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#C9A227] px-1 text-[10px] font-bold leading-none text-[#111111] tabular-nums',
        pulse && 'motion-safe:animate-[cart-badge-pop_.45s_cubic-bezier(.2,1.3,.35,1)]',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

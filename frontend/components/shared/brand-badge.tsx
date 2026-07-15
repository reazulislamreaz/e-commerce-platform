import { cn } from '@/lib/utils';

/**
 * Original ElevateApparel "EA" monogram badge — rounded square in brand ink
 * with a gold serif-style monogram drawn from simple strokes.
 */
export function BrandBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn('size-9 shrink-0', className)}>
      <rect x="1.5" y="1.5" width="45" height="45" rx="10" fill="#111827" />
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        rx="10"
        fill="none"
        stroke="#d4af37"
        strokeWidth="1.5"
      />
      {/* E — three bars */}
      <path d="M11 15h11v3.4H14.8v4.4H21v3.4h-6.2v4.4H22V34H11V15Z" fill="#d4af37" />
      {/* A — angled letterform */}
      <path
        d="M30.6 15h3.8L41 34h-4l-1.3-3.9h-6.4L28 34h-4l6.6-19Zm4 11.7-2.1-6.4-2.1 6.4h4.2Z"
        fill="#d4af37"
      />
    </svg>
  );
}

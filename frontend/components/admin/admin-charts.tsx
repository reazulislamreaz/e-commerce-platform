import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Lightweight SVG chart primitives for the admin console. Colors flow through
 * `currentColor`, so callers control the palette with text-color utilities.
 */

function toPolyline(values: number[], width: number, height: number, pad: number): string {
  if (values.length === 0) return '';
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return values
    .map((value, index) => {
      const x = pad + index * step;
      const y = height - pad - ((value - min) / range) * (height - pad * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const gradientId = useId();
  const width = 100;
  const height = 32;
  const points = toPolyline(values, width, height, 2);
  const area = points ? `${points} ${width - 2},${height} 2,${height}` : '';

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('h-8 w-full', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {area ? <polygon points={area} fill={`url(#${gradientId})`} /> : null}
      {points ? (
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  );
}

export type DonutSegment = {
  label: string;
  value: number;
  /** Any valid CSS color. */
  color: string;
};

export function DonutChart({
  segments,
  centerLabel,
  centerSub,
  className,
}: {
  segments: DonutSegment[];
  centerLabel: string;
  centerSub?: string;
  className?: string;
}) {
  const size = 160;
  const thickness = 15;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  const visible = segments.filter((segment) => segment.value > 0);
  const arcs = visible.map((segment, index) => {
    const before = visible.slice(0, index).reduce((sum, prior) => sum + prior.value, 0);
    return {
      ...segment,
      dash: total > 0 ? (segment.value / total) * circumference : 0,
      offset: total > 0 ? (before / total) * circumference : 0,
    };
  });

  return (
    <svg
      role="img"
      aria-label={`${centerLabel}${centerSub ? ` ${centerSub}` : ''}`}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('size-40', className)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#FAFAFA"
        strokeWidth={thickness}
      />
      {arcs.map((arc) => (
        <circle
          key={arc.label}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={arc.color}
          strokeWidth={thickness}
          strokeLinecap={arcs.length > 1 ? 'butt' : 'round'}
          strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
          strokeDashoffset={-arc.offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ))}
      <text x="50%" y="47%" textAnchor="middle" className="fill-white text-[26px] font-extrabold">
        {centerLabel}
      </text>
      {centerSub ? (
        <text
          x="50%"
          y="60%"
          textAnchor="middle"
          className="fill-[#555555] text-[10px] font-bold uppercase tracking-[.14em]"
        >
          {centerSub}
        </text>
      ) : null}
    </svg>
  );
}

export type AreaChartPoint = { label: string; value: number };

function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

export function AreaChart({
  points,
  formatValue,
  className,
}: {
  points: AreaChartPoint[];
  formatValue: (value: number) => string;
  className?: string;
}) {
  const gradientId = useId();
  const width = 100;
  const height = 100;
  const max = niceCeiling(Math.max(...points.map((point) => point.value), 1));
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const coords = points.map((point, index) => ({
    x: index * step,
    y: height - (point.value / max) * height,
  }));
  const line = coords.map((coord) => `${coord.x.toFixed(2)},${coord.y.toFixed(2)}`).join(' ');
  const area = line ? `${line} ${width},${height} 0,${height}` : '';
  const last = coords.at(-1);

  return (
    <div className={className}>
      <div className="flex gap-3">
        <div
          aria-hidden
          className="flex w-12 shrink-0 flex-col justify-between pb-0.5 text-right text-[10px] font-semibold text-[#555555]"
        >
          <span>{formatValue(max)}</span>
          <span>{formatValue(max / 2)}</span>
          <span>{formatValue(0)}</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <svg
            aria-hidden
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="h-44 w-full"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9A227" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#C9A227" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 50, 100].map((y) => (
              <line
                key={y}
                x1="0"
                x2={width}
                y1={y}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {area ? <polygon points={area} fill={`url(#${gradientId})`} /> : null}
            {line ? (
              <polyline
                points={line}
                fill="none"
                stroke="#C9A227"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
          {last ? (
            <span
              aria-hidden
              className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C9A227] shadow-[0_0_0_4px_rgba(201,162,39,.2)]"
              style={{ left: `${last.x}%`, top: `${(last.y / height) * 100}%` }}
            />
          ) : null}
        </div>
      </div>
      <div
        aria-hidden
        className="mt-2 flex justify-between pl-[60px] text-[10px] font-semibold text-[#555555]"
      >
        {points.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
      <span className="sr-only">
        {points.map((point) => `${point.label}: ${formatValue(point.value)}`).join(', ')}
      </span>
    </div>
  );
}

export function MeterBar({ percent, className }: { percent: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7EB]', className)}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#C9A227] to-[#C9A227]"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

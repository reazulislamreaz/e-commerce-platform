'use client';

import { useState, type ComponentType, type PropsWithChildren, type ReactNode } from 'react';
import { AlertCircle, ChevronDown, Inbox, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold tracking-[-.02em] text-[#111111] sm:text-2xl">
          {title}
        </h1>
        {description ? <p className="mt-1 text-sm text-[#555555]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminPanel({
  title,
  description,
  actions,
  collapsible = false,
  children,
  className,
}: PropsWithChildren<{
  title: string;
  description?: string;
  actions?: ReactNode;
  collapsible?: boolean;
  className?: string;
}>) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section
      className={cn(
        'rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] sm:p-6',
        className,
      )}
    >
      <div className={cn('flex flex-wrap items-start justify-between gap-3', !collapsed && 'mb-5')}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {collapsible ? (
              <button
                type="button"
                onClick={() => setCollapsed((value) => !value)}
                aria-expanded={!collapsed}
                className="rounded-md p-0.5 text-[#555555] transition-colors hover:text-[#C9A227] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]"
              >
                <ChevronDown
                  className={cn(
                    'size-4 transition-transform duration-200',
                    collapsed && '-rotate-90',
                  )}
                  strokeWidth={1.7}
                />
                <span className="sr-only">{collapsed ? 'Expand section' : 'Collapse section'}</span>
              </button>
            ) : null}
            <h2 className="text-[13px] font-bold uppercase tracking-[.12em] text-[#111111]">
              {title}
            </h2>
          </div>
          {description && !collapsed ? (
            <p className="mt-1.5 text-sm leading-relaxed text-[#555555]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {collapsed ? null : children}
    </section>
  );
}

export function AdminButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-[4px] font-bold uppercase tracking-[.08em] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        size === 'sm' ? 'px-2.5 py-1.5 text-[10px]' : 'px-3.5 py-2 text-[10px]',
        variant === 'primary' &&
          'border border-[#111111] bg-[#111111] text-white hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]',
        variant === 'secondary' &&
          'border border-[#111111] bg-white text-[#111111] hover:bg-[#111111] hover:text-white',
        variant === 'ghost' &&
          'border border-transparent bg-transparent text-[#555555] hover:bg-[#FAFAFA] hover:text-[#111111]',
        variant === 'danger' &&
          'border border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100',
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" strokeWidth={2} /> : null}
      {children}
    </button>
  );
}

const iconActionTones = {
  neutral: 'hover:text-[#111111]',
  gold: 'hover:text-[#C9A227]',
  danger: 'hover:border-red-200 hover:bg-red-50 hover:text-red-700',
} as const;

/** Class builder for compact table row actions — usable on buttons and links. */
export function adminIconActionClass(
  tone: keyof typeof iconActionTones = 'neutral',
  className?: string,
) {
  return cn(
    'rounded-lg border border-transparent p-1.5 text-[#555555] transition-colors hover:border-[#E5E7EB] hover:bg-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227] disabled:cursor-not-allowed disabled:opacity-50',
    iconActionTones[tone],
    className,
  );
}

export function AdminIconButton({
  tone = 'neutral',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: keyof typeof iconActionTones;
}) {
  return <button type="button" className={adminIconActionClass(tone, className)} {...props} />;
}

export function AdminTable({ children }: PropsWithChildren) {
  return (
    <div className="max-h-[70vh] overflow-auto rounded-lg border border-[#E5E7EB]">
      <table
        className={cn(
          'min-w-full border-separate border-spacing-0 text-left text-sm text-[#111111]',
          '[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-[#F4F4F5]',
          '[&_tbody_tr]:transition-colors [&_tbody_tr:nth-child(odd)]:bg-[#FAFAFA] [&_tbody_tr:hover]:bg-[#C9A227]/[0.06]',
        )}
      >
        {children}
      </table>
    </div>
  );
}

export function AdminTh({
  children,
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...props}
      className={cn(
        'border-b border-[#E5E7EB] px-4 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function AdminTd({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <td className={cn('border-b border-[#E5E7EB] px-4 py-3.5 align-top', className)}>{children}</td>
  );
}

export function AdminEmpty({ children }: PropsWithChildren) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] text-[#555555]">
        <Inbox className="size-5" strokeWidth={1.6} />
      </span>
      <p className="max-w-sm text-sm leading-relaxed text-[#555555]">{children}</p>
    </div>
  );
}

export function AdminError({ children }: PropsWithChildren) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.7} />
      <span>{children}</span>
    </p>
  );
}

const inputStyles =
  'w-full rounded-[4px] border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm text-[#111111] transition-colors outline-none placeholder:text-[#555555] hover:border-[#D1D5DB] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 disabled:cursor-not-allowed disabled:opacity-50';

export function AdminInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputStyles, props.className)} />;
}

export function AdminSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputStyles, props.className)} />;
}

export function AdminTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputStyles, props.className)} />;
}

type StatusTone = 'success' | 'info' | 'warning' | 'error' | 'neutral';

const toneByStatus: Record<string, StatusTone> = {
  DELIVERED: 'success',
  PUBLISHED: 'success',
  ACTIVE: 'success',
  COMPLETED: 'success',
  RESOLVED: 'success',
  APPROVED: 'success',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  SHIPPED: 'info',
  NEW: 'info',
  IN_PROGRESS: 'info',
  PENDING: 'warning',
  PENDING_VERIFICATION: 'warning',
  DRAFT: 'warning',
  INACTIVE: 'warning',
  CANCELLED: 'error',
  REJECTED: 'error',
  SUSPENDED: 'error',
  SPAM: 'error',
  RETURNED: 'error',
  LOW: 'warning',
  OUT: 'error',
  BRAND: 'info',
  CATEGORY: 'success',
  COLLECTION: 'warning',
};

const toneStyles: Record<StatusTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  warning: 'border-[#E8D9A8] bg-[#FFF8E7] text-[#C9A227]',
  error: 'border-red-200 bg-red-50 text-red-700',
  neutral: 'border-[#E5E7EB] bg-[#FAFAFA] text-[#555555]',
};

const dotStyles: Record<StatusTone, string> = {
  success: 'bg-emerald-500',
  info: 'bg-sky-500',
  warning: 'bg-[#C9A227]',
  error: 'bg-red-500',
  neutral: 'bg-[#555555]',
};

function resolveTone(children: ReactNode): StatusTone {
  if (typeof children !== 'string') return 'neutral';
  const key = children
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  return toneByStatus[key] ?? 'neutral';
}

export function StatusPill({ children }: PropsWithChildren) {
  const tone = resolveTone(children);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[.1em]',
        toneStyles[tone],
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', dotStyles[tone])} />
      {children}
    </span>
  );
}

export function AdminSkeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-[#E5E7EB]', className)} />;
}

export function AdminField({
  label,
  error,
  hint,
  className,
  children,
}: PropsWithChildren<{ label: string; error?: string; hint?: string; className?: string }>) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-sm font-medium text-[#111111]">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-[#555555]">{hint}</span>
      ) : null}
    </label>
  );
}

const statTones = {
  gold: 'border-[#C9A227]/40 bg-[#C9A227]/10 text-[#C9A227]',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  orange: 'border-orange-200 bg-orange-50 text-orange-700',
  sky: 'border-sky-200 bg-sky-50 text-sky-700',
} as const;

export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'gold',
  loading = false,
  active = false,
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  tone?: keyof typeof statTones;
  loading?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick, 'aria-pressed': active } : {})}
      className={cn(
        'rounded-xl border bg-white p-4 text-left shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all duration-150',
        active ? 'border-[#C9A227] ring-1 ring-[#C9A227]/25' : 'border-[#E5E7EB]',
        onClick &&
          'hover:-translate-y-0.5 hover:border-[#C9A227]/60 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">{label}</p>
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg border',
            statTones[tone],
          )}
        >
          <Icon className="size-4" strokeWidth={1.7} />
        </span>
      </div>
      {loading ? (
        <AdminSkeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className="mt-1.5 text-2xl font-extrabold tracking-[-.02em] text-[#111111]">{value}</p>
      )}
      {hint ? <p className="mt-1 text-xs text-[#555555]">{hint}</p> : null}
    </Wrapper>
  );
}

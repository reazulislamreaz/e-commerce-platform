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
        <h1 className="text-xl font-extrabold tracking-[-.02em] text-white sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-[#b5b0a8]">{description}</p> : null}
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
        'rounded-xl border border-[#26231f] bg-[#111110] p-5 shadow-[0_1px_2px_rgba(0,0,0,.35),0_12px_32px_-16px_rgba(0,0,0,.55)] sm:p-6',
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
                className="rounded-md p-0.5 text-[#b5b0a8] transition-colors hover:text-[#e3bb78] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3bb78]"
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
            <h2 className="text-[13px] font-bold uppercase tracking-[.12em] text-white">{title}</h2>
          </div>
          {description && !collapsed ? (
            <p className="mt-1.5 text-sm leading-relaxed text-[#b5b0a8]">{description}</p>
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
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-bold uppercase tracking-[.08em] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3bb78] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        size === 'sm' ? 'px-2.5 py-1.5 text-[10px]' : 'px-3.5 py-2 text-[10px]',
        variant === 'primary' &&
          'border border-[#efc677] bg-[#e5bd79] text-[#18120b] shadow-[0_2px_10px_-4px_rgba(229,189,121,.5)] hover:bg-[#eec98a]',
        variant === 'secondary' &&
          'border border-[#37332c] bg-white/[0.02] text-white hover:border-[#e3bb78]/60 hover:bg-white/[0.04]',
        variant === 'ghost' &&
          'border border-transparent bg-transparent text-[#d8d4cd] hover:bg-white/[0.05] hover:text-white',
        variant === 'danger' &&
          'border border-red-900/60 bg-red-950/40 text-red-200 hover:border-red-700 hover:bg-red-950/60',
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
  neutral: 'hover:text-white',
  gold: 'hover:text-[#e3bb78]',
  danger: 'hover:border-red-900/60 hover:bg-red-950/40 hover:text-red-300',
} as const;

/** Class builder for compact table row actions — usable on buttons and links. */
export function adminIconActionClass(
  tone: keyof typeof iconActionTones = 'neutral',
  className?: string,
) {
  return cn(
    'rounded-lg border border-transparent p-1.5 text-[#b5b0a8] transition-colors hover:border-[#37332c] hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3bb78] disabled:cursor-not-allowed disabled:opacity-50',
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
    <div className="max-h-[70vh] overflow-auto rounded-lg border border-[#26231f]">
      <table
        className={cn(
          'min-w-full border-separate border-spacing-0 text-left text-sm text-[#e9e5de]',
          '[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-[#161513]',
          '[&_tbody_tr]:transition-colors [&_tbody_tr:nth-child(odd)]:bg-white/[0.015] [&_tbody_tr:hover]:bg-[#e3bb78]/[0.05]',
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
        'border-b border-[#2d2a27] px-4 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function AdminTd({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <td className={cn('border-b border-[#26231f]/70 px-4 py-3.5 align-top', className)}>
      {children}
    </td>
  );
}

export function AdminEmpty({ children }: PropsWithChildren) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl border border-[#26231f] bg-[#161513] text-[#8b867d]">
        <Inbox className="size-5" strokeWidth={1.6} />
      </span>
      <p className="max-w-sm text-sm leading-relaxed text-[#b5b0a8]">{children}</p>
    </div>
  );
}

export function AdminError({ children }: PropsWithChildren) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-red-900/50 bg-red-950/30 px-3.5 py-2.5 text-sm text-red-200"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.7} />
      <span>{children}</span>
    </p>
  );
}

const inputStyles =
  'w-full rounded-lg border border-[#37332c] bg-[#1a1815] px-3.5 py-2.5 text-sm text-white transition-colors outline-none placeholder:text-[#6f6a61] hover:border-[#4a4438] focus:border-[#e3bb78] focus:ring-2 focus:ring-[#e3bb78]/15 disabled:cursor-not-allowed disabled:opacity-50';

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
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  error: 'border-red-500/30 bg-red-500/10 text-red-300',
  neutral: 'border-[#37332c] bg-[#1a1815] text-[#b5b0a8]',
};

const dotStyles: Record<StatusTone, string> = {
  success: 'bg-emerald-400',
  info: 'bg-sky-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
  neutral: 'bg-[#8b867d]',
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
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-white/[0.06]', className)} />;
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
      <span className="mb-1.5 block text-sm font-medium text-[#d8d4cd]">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-400">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-[#8b867d]">{hint}</span>
      ) : null}
    </label>
  );
}

const statTones = {
  gold: 'border-[#e3bb78]/25 bg-[#e3bb78]/10 text-[#e3bb78]',
  emerald: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  rose: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  orange: 'border-orange-500/25 bg-orange-500/10 text-orange-300',
  sky: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
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
        'rounded-xl border bg-[#111110] p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,.35)] transition-all duration-150',
        active ? 'border-[#e3bb78]/60 ring-1 ring-[#e3bb78]/20' : 'border-[#26231f]',
        onClick &&
          'hover:-translate-y-0.5 hover:border-[#e3bb78]/40 hover:shadow-[0_10px_28px_-14px_rgba(0,0,0,.7)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3bb78]',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#8b867d]">{label}</p>
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
        <p className="mt-1.5 text-2xl font-extrabold tracking-[-.02em] text-white">{value}</p>
      )}
      {hint ? <p className="mt-1 text-xs text-[#8b867d]">{hint}</p> : null}
    </Wrapper>
  );
}

'use client';

import type { PropsWithChildren, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function AdminPanel({
  title,
  description,
  actions,
  children,
  className,
}: PropsWithChildren<{
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}>) {
  return (
    <section
      className={cn(
        'rounded-[4px] border border-[#2d2a27] bg-[#111110] p-4 sm:p-5',
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">{title}</h2>
          {description ? <p className="mt-1 text-sm text-[#b5b0a8]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function AdminButton({
  children,
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-[4px] px-3 py-2 text-[10px] font-bold uppercase tracking-[.08em] transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' &&
          'border border-[#efc677] bg-[#e5bd79] text-[#18120b] hover:bg-[#eec98a]',
        variant === 'secondary' &&
          'border border-[#37332c] bg-transparent text-white hover:border-[#e3bb78]',
        variant === 'danger' &&
          'border border-red-900/60 bg-red-950/40 text-red-200 hover:border-red-700',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function AdminTable({ children }: PropsWithChildren) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm text-[#e9e5de]">{children}</table>
    </div>
  );
}

export function AdminTh({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <th
      className={cn(
        'border-b border-[#2d2a27] px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function AdminTd({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <td className={cn('border-b border-[#2d2a27]/60 px-3 py-3 align-top', className)}>{children}</td>;
}

export function AdminEmpty({ children }: PropsWithChildren) {
  return <p className="py-8 text-center text-sm text-[#b5b0a8]">{children}</p>;
}

export function AdminError({ children }: PropsWithChildren) {
  return (
    <p className="rounded-[4px] border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
      {children}
    </p>
  );
}

export function AdminInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-[4px] border border-[#37332c] bg-[#1a1815] px-3 py-2 text-sm text-white outline-none focus:border-[#e3bb78]',
        props.className,
      )}
    />
  );
}

export function AdminSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'w-full rounded-[4px] border border-[#37332c] bg-[#1a1815] px-3 py-2 text-sm text-white outline-none focus:border-[#e3bb78]',
        props.className,
      )}
    />
  );
}

export function AdminTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full rounded-[4px] border border-[#37332c] bg-[#1a1815] px-3 py-2 text-sm text-white outline-none focus:border-[#e3bb78]',
        props.className,
      )}
    />
  );
}

export function StatusPill({ children }: PropsWithChildren) {
  return (
    <span className="inline-flex rounded-[4px] border border-[#37332c] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.1em] text-[#e3bb78]">
      {children}
    </span>
  );
}

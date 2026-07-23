'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { AdminButton, AdminSelect } from '@/components/admin/admin-ui';
import { cn } from '@/lib/utils';

export const ADMIN_PAGE_SIZES = [10, 20, 50, 100] as const;
export type AdminPageSize = (typeof ADMIN_PAGE_SIZES)[number];

export type AdminPaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type AdminPaginationProps = {
  meta: AdminPaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: AdminPageSize) => void;
  /** Soften the footer while a refetch is in flight. */
  isFetching?: boolean;
  /** Label for the total count, e.g. "users" / "customers" / "staff". */
  entityLabel?: string;
  className?: string;
};

/** Compact page list: 1 … window … last (matches storefront/admin CRM pattern). */
export function adminPaginationItems(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) items.push('ellipsis');
  for (let n = start; n <= end; n += 1) items.push(n);
  if (end < totalPages - 1) items.push('ellipsis');
  items.push(totalPages);
  return items;
}

export function formatAdminPageRange(meta: AdminPaginationMeta): string {
  if (meta.total === 0) return `Showing 0 of 0`;
  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.total);
  return `Showing ${from}–${to} of ${meta.total}`;
}

/**
 * Shared admin list pagination: page size, range label, first/prev/numbers/next/last.
 * Used by CRM, User Management, and Staff Management for a consistent UX.
 */
export function AdminPagination({
  meta,
  onPageChange,
  onPageSizeChange,
  isFetching = false,
  entityLabel = 'records',
  className,
}: AdminPaginationProps) {
  const pages = adminPaginationItems(meta.page, meta.totalPages);
  const canPrev = meta.page > 1;
  const canNext = meta.page < meta.totalPages;

  return (
    <div
      className={cn(
        'mt-4 flex flex-col gap-3 border-t border-[#E5E7EB] pt-4 sm:flex-row sm:items-center sm:justify-between',
        isFetching && 'opacity-70 transition-opacity',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3 text-xs text-[#555555]">
        <p>
          {formatAdminPageRange(meta)} {entityLabel}
        </p>
        <label className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[.08em] text-[#555555]">
            Per page
          </span>
          <AdminSelect
            aria-label="Rows per page"
            className="w-[88px]"
            value={String(meta.pageSize)}
            onChange={(event) => {
              const next = Number(event.target.value) as AdminPageSize;
              onPageSizeChange(next);
            }}
          >
            {ADMIN_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </AdminSelect>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1">
        <AdminButton
          variant="secondary"
          className="!px-2"
          disabled={!canPrev}
          aria-label="First page"
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft className="size-3.5" strokeWidth={1.7} />
        </AdminButton>
        <AdminButton
          variant="secondary"
          className="!px-2"
          disabled={!canPrev}
          aria-label="Previous page"
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft className="size-3.5" strokeWidth={1.7} />
          <span className="hidden sm:inline">Prev</span>
        </AdminButton>

        {pages.map((item, index) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-1 text-xs text-[#555555]" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={`Page ${item}`}
              aria-current={item === meta.page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              className={cn(
                'min-w-8 rounded-[4px] border px-2 py-1.5 text-[11px] font-bold transition-colors',
                item === meta.page
                  ? 'border-[#111111] bg-[#111111] text-white'
                  : 'border-[#E5E7EB] bg-white text-[#111111] hover:border-[#C9A227] hover:text-[#C9A227]',
              )}
            >
              {item}
            </button>
          ),
        )}

        <AdminButton
          variant="secondary"
          className="!px-2"
          disabled={!canNext}
          aria-label="Next page"
          onClick={() => onPageChange(meta.page + 1)}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-3.5" strokeWidth={1.7} />
        </AdminButton>
        <AdminButton
          variant="secondary"
          className="!px-2"
          disabled={!canNext}
          aria-label="Last page"
          onClick={() => onPageChange(meta.totalPages)}
        >
          <ChevronsRight className="size-3.5" strokeWidth={1.7} />
        </AdminButton>
      </div>
    </div>
  );
}

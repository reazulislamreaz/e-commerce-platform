export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface OffsetPaginationQuery {
  page?: number;
  limit?: number;
  pageSize?: number;
}

/** Offset pagination meta shared by all admin list endpoints (mirrors users/CRM/orders). */
export interface OffsetPaginationMeta {
  page: number;
  pageSize: number;
  limit: number;
  total: number;
  totalPages: number;
  nextCursor: null;
}

export interface ResolvedOffsetPagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

/** Normalise page/limit into safe skip/take values (clamped to [1, MAX_PAGE_SIZE]). */
export function resolveOffsetPagination(
  query: OffsetPaginationQuery,
  fallbackSize = DEFAULT_PAGE_SIZE,
): ResolvedOffsetPagination {
  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const rawSize = query.limit ?? query.pageSize ?? fallbackSize;
  const pageSize = Math.min(Math.max(1, Math.trunc(rawSize)), MAX_PAGE_SIZE);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Build the offset meta envelope; `nextCursor` is always null for parity with cursor responses. */
export function buildOffsetMeta(
  page: number,
  pageSize: number,
  total: number,
): OffsetPaginationMeta {
  return {
    page,
    pageSize,
    limit: pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    nextCursor: null,
  };
}

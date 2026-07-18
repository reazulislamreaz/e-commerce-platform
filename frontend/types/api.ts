/** Minimal success shape — every backend response includes at least `data`. */
export interface ApiEnvelope<T> {
  data: T;
}

/** Live backend contract: `{ success, message, data, meta? }`. */
export interface ApiResponse<T, M = Record<string, unknown>> {
  success: boolean;
  message: string;
  data: T;
  meta?: M;
}

export interface CursorPageMeta {
  nextCursor?: string | null;
  prevCursor?: string | null;
  hasMore: boolean;
  limit: number;
}

export interface OffsetPageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function unwrapData<T>(payload: ApiEnvelope<T> | ApiResponse<T>): T {
  return payload.data;
}

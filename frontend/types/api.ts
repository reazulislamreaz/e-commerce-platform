export interface ApiEnvelope<T> {
  data: T;
}

/** Target contract from CLAUDE.md — migrate clients when backend adopts it. */
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

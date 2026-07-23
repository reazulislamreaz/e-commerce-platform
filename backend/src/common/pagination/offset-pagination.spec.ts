import { buildOffsetMeta, MAX_PAGE_SIZE, resolveOffsetPagination } from './offset-pagination';

describe('resolveOffsetPagination', () => {
  it('defaults to page 1 and the fallback size', () => {
    expect(resolveOffsetPagination({})).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 });
  });

  it('computes skip from page and pageSize', () => {
    expect(resolveOffsetPagination({ page: 3, limit: 10 })).toEqual({
      page: 3,
      pageSize: 10,
      skip: 20,
      take: 10,
    });
  });

  it('prefers limit over pageSize', () => {
    const resolved = resolveOffsetPagination({ limit: 50, pageSize: 10 });
    expect(resolved.pageSize).toBe(50);
  });

  it('clamps invalid page and page size to safe bounds', () => {
    expect(resolveOffsetPagination({ page: 0, limit: 0 }).page).toBe(1);
    expect(resolveOffsetPagination({ page: 0, limit: 0 }).pageSize).toBe(1);
    expect(resolveOffsetPagination({ limit: 5000 }).pageSize).toBe(MAX_PAGE_SIZE);
  });
});

describe('buildOffsetMeta', () => {
  it('builds the shared offset meta envelope', () => {
    expect(buildOffsetMeta(2, 20, 45)).toEqual({
      page: 2,
      pageSize: 20,
      limit: 20,
      total: 45,
      totalPages: 3,
      nextCursor: null,
    });
  });

  it('always reports at least one page', () => {
    expect(buildOffsetMeta(1, 20, 0).totalPages).toBe(1);
  });
});

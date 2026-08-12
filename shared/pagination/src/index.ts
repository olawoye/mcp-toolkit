export interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  nextCursor?: string;
  hasMore: boolean;
}

export function buildOffsetParams(params: PaginationParams): { offset: number; limit: number } {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 10));
  return { offset: (page - 1) * pageSize, limit: pageSize };
}

export function paginatedResult<T>(
  items: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

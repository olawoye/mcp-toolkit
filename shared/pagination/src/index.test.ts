import { describe, it, expect } from 'vitest';
import { buildOffsetParams, paginatedResult } from './index.js';

describe('buildOffsetParams', () => {
  it('computes offset and limit from page/pageSize', () => {
    expect(buildOffsetParams({ page: 2, pageSize: 10 })).toEqual({ offset: 10, limit: 10 });
  });

  it('defaults to page 1, pageSize 10', () => {
    expect(buildOffsetParams({})).toEqual({ offset: 0, limit: 10 });
  });

  it('clamps pageSize to 100', () => {
    expect(buildOffsetParams({ pageSize: 500 }).limit).toBe(100);
  });

  it('clamps pageSize minimum to 1', () => {
    expect(buildOffsetParams({ pageSize: 0 }).limit).toBe(1);
  });
});

describe('paginatedResult', () => {
  it('returns correct shape with hasMore=true', () => {
    const result = paginatedResult(['a', 'b', 'c'], 30, { page: 1, pageSize: 10 });
    expect(result.items).toEqual(['a', 'b', 'c']);
    expect(result.total).toBe(30);
    expect(result.hasMore).toBe(true);
  });

  it('hasMore is false on last page', () => {
    const result = paginatedResult(['x'], 10, { page: 1, pageSize: 10 });
    expect(result.hasMore).toBe(false);
  });
});

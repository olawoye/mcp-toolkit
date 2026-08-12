import { describe, it, expect, vi } from 'vitest';
import { deepClone, pick, compact, buildUrl, withRetry } from './index.js';

describe('deepClone', () => {
  it('returns a deep copy', () => {
    const obj = { a: { b: 1 } };
    const clone = deepClone(obj);
    clone.a.b = 99;
    expect(obj.a.b).toBe(1);
  });
});

describe('pick', () => {
  it('returns only selected keys', () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });
});

describe('compact', () => {
  it('removes null and undefined values', () => {
    expect(compact({ a: 1, b: null, c: undefined, d: 0 })).toEqual({ a: 1, d: 0 });
  });
});

describe('buildUrl', () => {
  it('appends query params', () => {
    const url = buildUrl('https://example.com/search', { q: 'test', n: 10 });
    expect(url).toContain('q=test');
    expect(url).toContain('n=10');
  });

  it('skips undefined params', () => {
    const url = buildUrl('https://example.com/', { q: undefined });
    expect(url).not.toContain('q=');
  });
});

describe('withRetry', () => {
  it('returns value on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(fn, 3, 0)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(() => {
      calls++;
      if (calls < 3) throw new Error('fail');
      return Promise.resolve('done');
    });
    await expect(withRetry(fn, 3, 0)).resolves.toBe('done');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after maxAttempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(withRetry(fn, 2, 0)).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

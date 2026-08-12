import { describe, it, expect, vi } from 'vitest';
import { MemoryCache } from './index.js';

describe('MemoryCache', () => {
  it('stores and retrieves values', () => {
    const cache = new MemoryCache<string>({ ttlSeconds: 60 });
    cache.set('k', 'v');
    expect(cache.get('k')).toBe('v');
  });

  it('returns undefined for missing keys', () => {
    const cache = new MemoryCache<string>();
    expect(cache.get('missing')).toBeUndefined();
  });

  it('expires entries after TTL', () => {
    vi.useFakeTimers();
    const cache = new MemoryCache<string>({ ttlSeconds: 1 });
    cache.set('k', 'v');
    vi.advanceTimersByTime(1001);
    expect(cache.get('k')).toBeUndefined();
    vi.useRealTimers();
  });

  it('allows per-entry TTL override', () => {
    vi.useFakeTimers();
    const cache = new MemoryCache<string>({ ttlSeconds: 60 });
    cache.set('k', 'v', 1);
    vi.advanceTimersByTime(1001);
    expect(cache.get('k')).toBeUndefined();
    vi.useRealTimers();
  });

  it('deletes entries', () => {
    const cache = new MemoryCache<string>();
    cache.set('k', 'v');
    cache.delete('k');
    expect(cache.get('k')).toBeUndefined();
  });

  it('clears all entries', () => {
    const cache = new MemoryCache<string>();
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('tracks size', () => {
    const cache = new MemoryCache<number>();
    cache.set('x', 1);
    cache.set('y', 2);
    expect(cache.size()).toBe(2);
  });
});

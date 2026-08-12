import { describe, it, expect, vi } from 'vitest';
import { TokenBucket } from './index.js';
import { RateLimitError } from '@mcp-toolkit/errors';

describe('TokenBucket', () => {
  it('allows consumption within capacity', () => {
    const bucket = new TokenBucket({ capacity: 5, refillRate: 1 });
    expect(() => bucket.consume(3)).not.toThrow();
  });

  it('throws RateLimitError when capacity is exceeded', () => {
    const bucket = new TokenBucket({ capacity: 2, refillRate: 1 });
    bucket.consume(2);
    expect(() => bucket.consume(1)).toThrow(RateLimitError);
  });

  it('refills tokens over time', () => {
    vi.useFakeTimers();
    const bucket = new TokenBucket({ capacity: 5, refillRate: 5 });
    bucket.consume(5);
    vi.advanceTimersByTime(1000);
    expect(() => bucket.consume(5)).not.toThrow();
    vi.useRealTimers();
  });

  it('does not exceed capacity on refill', () => {
    vi.useFakeTimers();
    const bucket = new TokenBucket({ capacity: 3, refillRate: 10 });
    vi.advanceTimersByTime(10_000);
    // Should still only have capacity=3, so consuming 4 must fail
    expect(() => bucket.consume(4)).toThrow(RateLimitError);
    vi.useRealTimers();
  });
});

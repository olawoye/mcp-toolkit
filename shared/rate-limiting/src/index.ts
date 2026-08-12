import { RateLimitError } from '@mcp-toolkit/errors';

export interface TokenBucketOptions {
  /** Maximum tokens (= burst capacity) */
  capacity: number;
  /** Tokens added per second */
  refillRate: number;
}

/**
 * Simple in-process token-bucket rate limiter.
 * For production multi-instance deployments, replace with Redis-backed implementation.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(private readonly options: TokenBucketOptions) {
    this.tokens = options.capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.options.capacity,
      this.tokens + elapsed * this.options.refillRate,
    );
    this.lastRefill = now;
  }

  /**
   * Attempt to consume `cost` tokens. Throws RateLimitError if insufficient.
   */
  consume(cost = 1): void {
    this.refill();
    if (this.tokens < cost) {
      const waitSeconds = (cost - this.tokens) / this.options.refillRate;
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ~${Math.ceil(waitSeconds)}s`,
        Math.ceil(waitSeconds),
      );
    }
    this.tokens -= cost;
  }
}

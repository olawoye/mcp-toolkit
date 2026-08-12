import { describe, it, expect } from 'vitest';
import {
  McpToolkitError,
  ValidationError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ProviderError,
} from './index.js';

describe('McpToolkitError', () => {
  it('sets message, code and statusCode', () => {
    const err = new McpToolkitError('oops', 'TEST', 503);
    expect(err.message).toBe('oops');
    expect(err.code).toBe('TEST');
    expect(err.statusCode).toBe(503);
    expect(err instanceof Error).toBe(true);
  });

  it('defaults statusCode to 500', () => {
    expect(new McpToolkitError('x', 'Y').statusCode).toBe(500);
  });
});

describe('ValidationError', () => {
  it('has correct code and statusCode', () => {
    const err = new ValidationError('bad value', 'email');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.field).toBe('email');
    expect(err instanceof McpToolkitError).toBe(true);
  });
});

describe('AuthenticationError', () => {
  it('has correct code and statusCode', () => {
    const err = new AuthenticationError('no key');
    expect(err.code).toBe('AUTH_ERROR');
    expect(err.statusCode).toBe(401);
  });
});

describe('RateLimitError', () => {
  it('stores retryAfterSeconds', () => {
    const err = new RateLimitError('slow down', 30);
    expect(err.code).toBe('RATE_LIMIT_ERROR');
    expect(err.statusCode).toBe(429);
    expect(err.retryAfterSeconds).toBe(30);
  });
});

describe('NotFoundError', () => {
  it('has correct code and statusCode', () => {
    const err = new NotFoundError('missing');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.statusCode).toBe(404);
  });
});

describe('ProviderError', () => {
  it('stores provider and defaults statusCode to 502', () => {
    const err = new ProviderError('bad gateway', 'google');
    expect(err.provider).toBe('google');
    expect(err.statusCode).toBe(502);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { requireApiKey, optionalApiKey, bearerHeader } from './index.js';
import { AuthenticationError } from '@mcp-toolkit/errors';

describe('requireApiKey', () => {
  beforeEach(() => { process.env['TEST_API_KEY'] = 'secret'; });
  afterEach(() => { delete process.env['TEST_API_KEY']; });

  it('returns the env var value when set', () => {
    expect(requireApiKey({ envVar: 'TEST_API_KEY', provider: 'test' })).toBe('secret');
  });

  it('throws AuthenticationError when env var is missing', () => {
    expect(() =>
      requireApiKey({ envVar: 'MISSING_KEY', provider: 'test' }),
    ).toThrow(AuthenticationError);
  });
});

describe('optionalApiKey', () => {
  it('returns value when set', () => {
    process.env['OPT_KEY'] = 'val';
    expect(optionalApiKey('OPT_KEY')).toBe('val');
    delete process.env['OPT_KEY'];
  });

  it('returns undefined when not set', () => {
    expect(optionalApiKey('UNSET_KEY')).toBeUndefined();
  });
});

describe('bearerHeader', () => {
  it('returns an Authorization header with a ******', () => {
    const token = 'mytoken';
    const header = bearerHeader(token);
    const value = header['Authorization'] ?? '';
    expect(value.toLowerCase().startsWith('bearer ')).toBe(true);
    expect(value).toContain(token);
  });
});

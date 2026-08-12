import { describe, it, expect } from 'vitest';
import {
  requireString,
  requirePositiveNumber,
  optionalString,
  clampNumber,
  isValidUrl,
} from './index.js';
import { ValidationError } from '@mcp-toolkit/errors';

describe('requireString', () => {
  it('returns trimmed string for valid input', () => {
    expect(requireString('  hello  ', 'name')).toBe('hello');
  });

  it('throws for empty string', () => {
    expect(() => requireString('', 'name')).toThrow(ValidationError);
  });

  it('throws for non-string', () => {
    expect(() => requireString(42, 'name')).toThrow(ValidationError);
  });
});

describe('requirePositiveNumber', () => {
  it('returns value for positive number', () => {
    expect(requirePositiveNumber(5, 'count')).toBe(5);
  });

  it('throws for zero', () => {
    expect(() => requirePositiveNumber(0, 'count')).toThrow(ValidationError);
  });

  it('throws for negative', () => {
    expect(() => requirePositiveNumber(-1, 'count')).toThrow(ValidationError);
  });

  it('throws for non-number', () => {
    expect(() => requirePositiveNumber('5', 'count')).toThrow(ValidationError);
  });
});

describe('optionalString', () => {
  it('returns undefined for null/undefined', () => {
    expect(optionalString(undefined)).toBeUndefined();
    expect(optionalString(null)).toBeUndefined();
  });

  it('returns undefined for blank string', () => {
    expect(optionalString('   ')).toBeUndefined();
  });

  it('returns trimmed string', () => {
    expect(optionalString(' hello ')).toBe('hello');
  });
});

describe('clampNumber', () => {
  it('clamps to min', () => expect(clampNumber(-5, 0, 10)).toBe(0));
  it('clamps to max', () => expect(clampNumber(20, 0, 10)).toBe(10));
  it('passes through in-range values', () => expect(clampNumber(5, 0, 10)).toBe(5));
});

describe('isValidUrl', () => {
  it('returns true for valid URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost:3000/path?q=1')).toBe(true);
  });

  it('returns false for invalid URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});

import { ValidationError } from '@mcp-toolkit/errors';

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`Field "${field}" must be a non-empty string`, field);
  }
  return value.trim();
}

export function requirePositiveNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !isFinite(value) || value <= 0) {
    throw new ValidationError(`Field "${field}" must be a positive number`, field);
  }
  return value;
}

export function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  return undefined;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isValidUrl(raw: string): boolean {
  try {
    new URL(raw);
    return true;
  } catch {
    return false;
  }
}

/** Deep-clone a plain object via JSON round-trip. */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/** Return a new object with only the specified keys. */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

/** Remove undefined/null values from an object (shallow). */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) (result as Record<string, unknown>)[k] = v;
  }
  return result;
}

/** Sleep for ms milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry an async function up to maxAttempts times. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 200,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < maxAttempts - 1) await sleep(delayMs * Math.pow(2, i));
    }
  }
  throw lastError;
}

/** Format a URL with query parameters. */
export function buildUrl(base: string, params: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

import { ProviderError, RateLimitError } from '@mcp-toolkit/errors';
import { createLogger } from '@mcp-toolkit/logging';

const logger = createLogger('http');

export interface HttpClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
}

export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function httpGet<T = unknown>(
  url: string,
  options: HttpClientOptions = {},
): Promise<HttpResponse<T>> {
  const { timeoutMs = 10_000, maxRetries = 3, headers = {} } = options;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logger.debug('HTTP GET', { url, attempt });
      const res = await fetch(url, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after') ?? 5);
        if (attempt <= maxRetries) {
          logger.warn('Rate limited, backing off', { url, retryAfter });
          await sleep(retryAfter * 1000);
          continue;
        }
        throw new RateLimitError(`Rate limited by ${url}`, retryAfter);
      }

      if (!res.ok) {
        throw new ProviderError(
          `HTTP ${res.status} from ${url}`,
          url,
          res.status,
        );
      }

      const data = (await res.json()) as T;
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => { responseHeaders[key] = value; });

      return { status: res.status, data, headers: responseHeaders };
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof RateLimitError || err instanceof ProviderError) throw err;
      if (attempt > maxRetries) {
        throw new ProviderError(String(err), url);
      }
      logger.warn('HTTP error, retrying', { url, attempt, err: String(err) });
      await sleep(Math.pow(2, attempt) * 100);
    }
  }

  throw new ProviderError(`Exhausted retries for ${url}`, url);
}

export async function httpPost<T = unknown>(
  url: string,
  body: unknown,
  options: HttpClientOptions = {},
): Promise<HttpResponse<T>> {
  const { timeoutMs = 10_000, headers = {} } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new ProviderError(`HTTP ${res.status} from ${url}`, url, res.status);
    }

    const data = (await res.json()) as T;
    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => { responseHeaders[key] = value; });

    return { status: res.status, data, headers: responseHeaders };
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof ProviderError) throw err;
    throw new ProviderError(String(err), url);
  }
}

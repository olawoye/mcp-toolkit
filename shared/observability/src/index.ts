import { createLogger } from '@mcp-toolkit/logging';

const logger = createLogger('observability');

export interface Span {
  name: string;
  startedAt: number;
  attributes: Record<string, unknown>;
  end(status?: 'ok' | 'error'): void;
}

/**
 * Lightweight no-op span — swap for OpenTelemetry in production.
 */
export function startSpan(name: string, attributes: Record<string, unknown> = {}): Span {
  const startedAt = Date.now();
  return {
    name,
    startedAt,
    attributes,
    end(status = 'ok') {
      const duration = Date.now() - startedAt;
      logger.debug('span.end', { name, status, duration, ...attributes });
    },
  };
}

export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes: Record<string, unknown> = {},
): Promise<T> {
  const span = startSpan(name, attributes);
  try {
    const result = await fn(span);
    span.end('ok');
    return result;
  } catch (err) {
    span.end('error');
    throw err;
  }
}

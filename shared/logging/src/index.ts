export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  child(context: Record<string, unknown>): Logger;
}

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function parseLevel(raw: string | undefined): LogLevel {
  if (raw && raw in LEVELS) return raw as LogLevel;
  return 'info';
}

export function createLogger(
  name: string,
  parentContext: Record<string, unknown> = {},
): Logger {
  const minLevel = parseLevel(process.env['LOG_LEVEL']);

  function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LEVELS[level] < LEVELS[minLevel]) return;
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { logger: name, ...parentContext, ...context },
    };
    const out = level === 'error' ? process.stderr : process.stdout;
    out.write(JSON.stringify(entry) + '\n');
  }

  return {
    debug: (m, c) => log('debug', m, c),
    info: (m, c) => log('info', m, c),
    warn: (m, c) => log('warn', m, c),
    error: (m, c) => log('error', m, c),
    child: (ctx) => createLogger(name, { ...parentContext, ...ctx }),
  };
}

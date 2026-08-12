import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from './index.js';

describe('createLogger', () => {
  let stdoutWrite: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env['LOG_LEVEL'];
  });

  it('writes a JSON log entry to stdout', () => {
    const logger = createLogger('test');
    logger.info('hello');
    expect(stdoutWrite).toHaveBeenCalledOnce();
    const entry = JSON.parse(String(stdoutWrite.mock.calls[0][0]));
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('hello');
    expect(entry.context?.logger).toBe('test');
  });

  it('suppresses debug logs when LOG_LEVEL=info', () => {
    process.env['LOG_LEVEL'] = 'info';
    const logger = createLogger('test');
    logger.debug('hidden');
    expect(stdoutWrite).not.toHaveBeenCalled();
  });

  it('child logger merges context', () => {
    const logger = createLogger('test');
    const child = logger.child({ requestId: 'abc' });
    child.info('from child');
    const entry = JSON.parse(String(stdoutWrite.mock.calls[0][0]));
    expect(entry.context?.requestId).toBe('abc');
  });

  it('writes error logs to stderr', () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const logger = createLogger('test');
    logger.error('boom');
    const entry = JSON.parse(String(stderrWrite.mock.calls[0][0]));
    expect(entry.level).toBe('error');
    stderrWrite.mockRestore();
  });
});

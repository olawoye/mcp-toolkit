import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer } from './server';

describe('web_search site filtering', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue('ok'),
      json: vi.fn().mockResolvedValue({ organic_results: [] }),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('expands the query with negative site filters from an array input', async () => {
    const server = createServer({ apiKey: 'test-key', baseUrl: 'https://serpapi.test' });
    const tool = server.tools.find((candidate) => candidate.name === 'web_search');

    expect(tool).toBeDefined();

    await tool!.execute({
      query: 'Health Care Companies in Nigeria',
      siteFilters: ['linkedin.com', 'indeed.com'],
      limit: 5,
    });

    const fetchMock = vi.mocked(fetch);
    const calledWith = fetchMock.mock.calls[0]?.[0] as string;

    expect(calledWith).toContain('q=Health+Care+Companies+in+Nigeria+-site%3Alinkedin.com+-site%3Aindeed.com');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServer } from './server';

describe('enrichment Apollo integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the current Apollo company and person endpoints with x-api-key auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ organizations: [{ id: 'org-1' }], people: [{ id: 'person-1' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const server = createServer({ apiKey: 'test-key', baseUrl: 'https://api.apollo.io' });

    await server.tools[0].execute({ domain: 'apollo.io' });
    await server.tools[1].execute({ name: 'Jane Doe', company_domain: 'apollo.io' });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.apollo.io/api/v1/mixed_companies/search',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
        }),
      }),
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.apollo.io/api/v1/mixed_people/api_search',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
        }),
      }),
    );
  });
});

import { describe, it, expect } from 'vitest';
import { createServer } from './server';

describe('website extraction server', () => {
  it('accepts extractionQuery and outputSchema for website lead extraction', async () => {
    const server = createServer();
    const tool = server.tools.find((candidate) => candidate.name === 'extract_website_data');

    expect(tool).toBeDefined();

    const originalFetch = global.fetch;
    global.fetch = async () => new Response(`
      <html>
        <head>
          <title>Top Design Agencies</title>
          <link rel="canonical" href="https://example.com/agencies" />
        </head>
        <body>
          <h1>Design Agencies</h1>
          <a href="https://example.com/company/acme">Acme Studio</a>
          <a href="https://example.com/company/zenith">Zenith Co</a>
          <a href="https://example.com/about">About us</a>
          <a href="https://google.com">Google</a>
        </body>
      </html>
    `, { status: 200, headers: { 'Content-Type': 'text/html' } });

    try {
      const result = await tool!.execute({
        url: 'https://example.com/agencies',
        extractionQuery: 'Extract multiple candidate companies from this list page',
        outputSchema: {
          type: 'object',
          properties: {
            company_name: { type: 'string' },
            domain: { type: 'string' },
          },
          required: ['company_name'],
        },
      });

      expect(result).toMatchObject({
        success: true,
        url: 'https://example.com/agencies',
        page_kind: 'list',
        title: 'Top Design Agencies',
        canonical_url: 'https://example.com/agencies',
        extractionQuery: 'Extract multiple candidate companies from this list page',
      });

      expect((result as any).outputSchema).toBeDefined();
      expect((result as any).pageText).toBeTruthy();
      expect(Array.isArray((result as any).outbound_links)).toBe(true);
      expect((result as any).outbound_links).toContain('https://example.com/company/acme');
      expect((result as any).candidate_cards.length).toBeGreaterThanOrEqual(2);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

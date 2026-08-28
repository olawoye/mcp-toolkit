import { describe, it, expect } from 'vitest';
import { createServer } from './server';

describe('website extraction server', () => {
  it('accepts extractionQuery and outputSchema for website lead extraction', async () => {
    const server = createServer();
    const tool = server.tools.find((candidate) => candidate.name === 'extract_website_data');

    expect(tool).toBeDefined();
    const result = await tool!.execute({
      url: 'https://example.com',
      extractionQuery: 'Parse company profile details',
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
      url: 'https://example.com',
      extractionQuery: 'Parse company profile details',
    });

    expect((result as any).outputSchema).toBeDefined();
    expect((result as any).pageText).toBeTruthy();
  });
});

import { googleSearch } from '@mcp-toolkit/provider-google';
import { requireString, clampNumber } from '@mcp-toolkit/validation';
import type { McpTool } from '../server.js';

export const newsTool: McpTool = {
  name: 'web_news_search',
  description: 'Search for recent news articles via Google.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'News search query' },
      num: { type: 'number', description: 'Number of results (1-10)' },
    },
    required: ['query'],
  },
  async execute(input: unknown) {
    const params = input as Record<string, unknown>;
    const query = requireString(params['query'], 'query');
    const num = clampNumber(Number(params['num'] ?? 5), 1, 10);

    const data = await googleSearch(`${query} news`, { num });
    return (data.items ?? []).map((p) => ({
      title: p.title,
      url: p.link,
      snippet: p.snippet,
    }));
  },
};

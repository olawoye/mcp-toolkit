import { googleSearch } from '@mcp-toolkit/provider-google';
import { bingSearch } from '@mcp-toolkit/provider-bing';
import { requireString, clampNumber } from '@mcp-toolkit/validation';
import { MemoryCache } from '@mcp-toolkit/caching';
import type { McpTool } from '../server.js';

const cache = new MemoryCache({ ttlSeconds: 300 });

export const searchTool: McpTool = {
  name: 'web_search',
  description: 'Search the web using Google Custom Search or Bing. Returns titles, URLs, and snippets.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      provider: { type: 'string', enum: ['google', 'bing'], description: 'Search provider (default: google)' },
      num: { type: 'number', description: 'Number of results (1-10, default: 10)' },
    },
    required: ['query'],
  },
  async execute(input: unknown) {
    const params = input as Record<string, unknown>;
    const query = requireString(params['query'], 'query');
    const provider = (params['provider'] as string) ?? 'google';
    const num = clampNumber(Number(params['num'] ?? 10), 1, 10);

    const cacheKey = `web_search:${provider}:${query}:${num}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    let results: unknown;
    if (provider === 'bing') {
      const data = await bingSearch(query, { count: num });
      results = (data.webPages?.value ?? []).map((p) => ({
        title: p.name,
        url: p.url,
        snippet: p.snippet,
      }));
    } else {
      const data = await googleSearch(query, { num });
      results = (data.items ?? []).map((p) => ({
        title: p.title,
        url: p.link,
        snippet: p.snippet,
      }));
    }

    cache.set(cacheKey, results);
    return results;
  },
};

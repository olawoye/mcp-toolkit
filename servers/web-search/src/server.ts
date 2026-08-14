import { createLogger } from '@mcp-toolkit/logging';

const logger = createLogger('web-search-server');

export interface McpTool {
  name: string;
  description: string;
  inputSchema: object;
  execute(input: unknown): Promise<unknown>;
}

export interface McpServer {
  name: string;
  version: string;
  tools: McpTool[];
  start(): void;
}

export const requiredEnvironment = [
  'MT_PROVIDER_SERP_URL',
  'MT_PROVIDER_SERP_KEY',
] as const;

export interface WebSearchServerConfig {
  provider?: 'serpapi';
  apiKey?: string;
  baseUrl?: string;
}

const resolveConfig = (config?: Partial<WebSearchServerConfig>): Required<Pick<WebSearchServerConfig, 'provider' | 'apiKey' | 'baseUrl'>> => ({
  provider: config?.provider ?? 'serpapi',
  apiKey: config?.apiKey ?? process.env.SERPAPI_API_KEY ?? '',
  baseUrl: config?.baseUrl ?? process.env.SERPAPI_BASE_URL ?? 'https://serpapi.com',
});

async function callSerpApi(
  config: ReturnType<typeof resolveConfig>,
  params: Record<string, string | number | undefined>,
): Promise<Record<string, unknown>> {
  if (!config.apiKey) {
    throw new Error('SERPAPI_API_KEY is not configured. Provide it via environment or server config.');
  }

  const url = new URL(`${config.baseUrl}/search.json`);
  url.searchParams.set('api_key', config.apiKey);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SerpAPI request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

export function createServer(config?: Partial<WebSearchServerConfig>): McpServer {
  const resolved = resolveConfig(config);

  const webSearchTool: McpTool = {
    name: 'web_search',
    description: 'Search the web for business, company, and market information using a search query.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query to execute.' },
        location: { type: 'string', description: 'Optional location to constrain results.' },
        limit: { type: 'number', description: 'Maximum number of search results to return.' },
      },
      required: ['query'],
    },
    async execute(input: unknown) {
      const payload = input as { query: string; location?: string; limit?: number };

      const result = await callSerpApi(resolved, {
        engine: 'google',
        q: payload.query,
        location: payload.location,
        num: payload.limit ?? 10,
      });

      const organicResults = Array.isArray(result.organic_results)
        ? result.organic_results.map((entry) => ({
            title: (entry as Record<string, unknown>).title ?? null,
            snippet: (entry as Record<string, unknown>).snippet ?? null,
            link: (entry as Record<string, unknown>).link ?? null,
          }))
        : [];

      return {
        success: true,
        query: payload.query,
        location: payload.location ?? null,
        limit: payload.limit ?? 10,
        results: organicResults,
        provider: resolved.provider,
        source: 'web-search',
      };
    },
  };

  const newsSearchTool: McpTool = {
    name: 'web_news_search',
    description: 'Search recent news and press coverage for a company, sector, or market trend.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'News query.' },
        days: { type: 'number', description: 'Lookback window in days.' },
      },
      required: ['query'],
    },
    async execute(input: unknown) {
      const payload = input as { query: string; days?: number };

      const result = await callSerpApi(resolved, {
        engine: 'google_news',
        q: payload.query,
        days: payload.days ?? 30,
      });

      const articles = Array.isArray(result.news_results)
        ? result.news_results.map((entry) => ({
            title: (entry as Record<string, unknown>).title ?? null,
            link: (entry as Record<string, unknown>).link ?? null,
            source: (entry as Record<string, unknown>).source ?? null,
            snippet: (entry as Record<string, unknown>).snippet ?? null,
          }))
        : [];

      return {
        success: true,
        query: payload.query,
        days: payload.days ?? 30,
        articles,
        provider: resolved.provider,
        source: 'web-search',
      };
    },
  };

  const tools: McpTool[] = [webSearchTool, newsSearchTool];

  return {
    name: 'web-search',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP web-search server ready', { tools: tools.map((t) => t.name), provider: resolved.provider });
    },
  };
}

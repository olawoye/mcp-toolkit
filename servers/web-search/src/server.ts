import { createLogger } from '@mcp-toolkit/logging';
import http from 'node:http';

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
  apiKey: config?.apiKey ?? process.env.MT_PROVIDER_SERP_KEY ?? process.env.SERPAPI_API_KEY ?? '',
  baseUrl: config?.baseUrl ?? process.env.MT_PROVIDER_SERP_URL ?? process.env.SERPAPI_BASE_URL ?? 'https://serpapi.com',
});

function buildSearchQuery(query: string, siteFilters?: string[]): string {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return trimmedQuery;

  const filters = (siteFilters ?? [])
    .map((site) => site?.trim())
    .filter((site): site is string => Boolean(site));

  if (filters.length === 0) return trimmedQuery;

  return `${trimmedQuery}${filters.map((site) => ` -site:${site}`).join('')}`;
}

function classifySearchResultUrl(url: string | null | undefined): { kind: 'direct-lead' | 'needs-extraction' | 'skip'; reason?: string } {
  if (!url) return { kind: 'skip', reason: 'missing-url' };

  const normalized = url.trim().toLowerCase();
  const directLeadPatterns = [
    /^(https?:\/\/)?(www\.)?(linkedin\.com|github\.com|angel\.co|crunchbase\.com|wellfound\.com|twitter\.com|x\.com|facebook\.com|instagram\.com)/i,
    /\b(company|about|contact|services|pricing|team|profile|bio|people)\b/i,
  ];

  const skipPatterns = [
    /^(https?:\/\/)?(www\.)?(google\.com|google\.[a-z]{2,3}|news\.google\.com|maps\.google\.com|mail\.google\.com)/i,
    /goto\?/i,
    /\b(job|jobs|salary|resume|cv|careers|recruit|vacancy)\b/i,
  ];

  if (skipPatterns.some((pattern) => pattern.test(normalized))) {
    return { kind: 'skip', reason: 'navigation-or-job-page' };
  }

  if (directLeadPatterns.some((pattern) => pattern.test(normalized))) {
    return { kind: 'direct-lead', reason: 'likely-direct-company-or-profile-page' };
  }

  return { kind: 'needs-extraction', reason: 'list-catalog-article-or-directory-page' };
}

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
        siteFilters: {
          type: 'array',
          description: 'Optional list of domains to exclude from the search using -site: filters.',
          items: { type: 'string' },
        },
      },
      required: ['query'],
    },
    async execute(input: unknown) {
      const payload = input as { query: string; location?: string; limit?: number; siteFilters?: string[] };
      const normalizedQuery = buildSearchQuery(payload.query, payload.siteFilters);

      const result = await callSerpApi(resolved, {
        engine: 'google',
        q: normalizedQuery,
        location: payload.location,
        num: payload.limit ?? 10,
      });

      const organicResults = Array.isArray(result.organic_results)
        ? result.organic_results.map((entry) => {
            const link = (entry as Record<string, unknown>).link ?? null;
            const classification = classifySearchResultUrl(typeof link === 'string' ? link : null);

            return {
              title: (entry as Record<string, unknown>).title ?? null,
              snippet: (entry as Record<string, unknown>).snippet ?? null,
              link,
              classification,
              handoff: classification.kind === 'needs-extraction'
                ? {
                    target_tool: 'extract_website_data',
                    target_field: 'url',
                    instruction: 'This result is a list, catalog, article, or directory page; it should be processed by the website extractor to find individual lead candidates.',
                  }
                : null,
            };
          })
        : [];

      return {
        success: true,
        query: normalizedQuery,
        location: payload.location ?? null,
        limit: payload.limit ?? 10,
        results: organicResults,
        direct_leads: organicResults.filter((item) => item.classification.kind === 'direct-lead'),
        needs_extraction: organicResults.filter((item) => item.classification.kind === 'needs-extraction'),
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
      const host = process.env.MCP_HOST ?? process.env.HOST ?? '127.0.0.1';
      const port = Number(process.env.MCP_PORT ?? process.env.PORT ?? 8155);

      const httpServer = http.createServer(async (req, res) => {
        const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);

        if (req.method === 'GET' && requestUrl.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, service: 'web-search', tools: tools.map((t) => t.name) }));
          return;
        }

        if (req.method === 'GET' && requestUrl.pathname === '/') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ name: 'web-search', version: '0.1.0', tools: tools.map((t) => t.name) }));
          return;
        }

        if (req.method === 'POST') {
          const toolName = requestUrl.pathname.replace(/^\/tools\//, '');
          const tool = tools.find((candidate) => candidate.name === toolName);

          if (!tool) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: `Unknown tool: ${toolName || requestUrl.pathname}` }));
            return;
          }

          let body: unknown;
          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid JSON body';
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: message }));
            return;
          }

          try {
            const result = await tool.execute(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, tool: tool.name, result }));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Tool execution failed';
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: message }));
          }
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Not found' }));
      });

      httpServer.listen(port, host, () => {
        logger.info('MCP web-search HTTP server ready', {
          host,
          port,
          tools: tools.map((t) => t.name),
          provider: resolved.provider,
        });
      });
    },
  };
}

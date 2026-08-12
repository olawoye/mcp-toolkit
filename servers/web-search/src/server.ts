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
    return {
      success: true,
      query: payload.query,
      location: payload.location ?? null,
      limit: payload.limit ?? 10,
      results: [],
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
    return {
      success: true,
      query: payload.query,
      days: payload.days ?? 30,
      articles: [],
      source: 'web-search',
    };
  },
};

export function createServer(): McpServer {
  const tools: McpTool[] = [webSearchTool, newsSearchTool];

  return {
    name: 'web-search',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP web-search server ready', { tools: tools.map((t) => t.name) });
    },
  };
}

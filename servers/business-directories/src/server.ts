import { createLogger } from '@mcp-toolkit/logging';

const logger = createLogger('business-directories-server');

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

/**
 * business-directories MCP server.
 * Tools will be registered here once the business scenario is defined.
 */
const companyDirectorySearchTool: McpTool = {
  name: 'company_directory_search',
  description: 'Search business directories and local listings for companies matching a target ICP and geography.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query, company name, or industry term.' },
      location: { type: 'string', description: 'Optional city, region, or postal code.' },
      limit: { type: 'number', description: 'Maximum number of directory results to return.' },
    },
    required: ['query'],
  },
  async execute(input: unknown) {
    const payload = input as { query: string; location?: string; limit?: number };
    return {
      success: true,
      query: payload.query,
      location: payload.location ?? null,
      limit: payload.limit ?? 25,
      results: [],
      source: 'business-directories',
    };
  },
};

const businessListingLookupTool: McpTool = {
  name: 'business_listing_lookup',
  description: 'Resolve a specific listing or company record from a directory dataset.',
  inputSchema: {
    type: 'object',
    properties: {
      company_name: { type: 'string', description: 'Company name to resolve.' },
      domain: { type: 'string', description: 'Optional company domain.' },
    },
    required: ['company_name'],
  },
  async execute(input: unknown) {
    const payload = input as { company_name: string; domain?: string };
    return {
      success: true,
      company_name: payload.company_name,
      domain: payload.domain ?? null,
      listing: null,
      source: 'business-directories',
    };
  },
};

export function createServer(): McpServer {
  const tools: McpTool[] = [companyDirectorySearchTool, businessListingLookupTool];

  return {
    name: 'business-directories',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP business-directories server ready', { tools: tools.map((t) => t.name) });
    },
  };
}

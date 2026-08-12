import { createLogger } from '@mcp-toolkit/logging';

const logger = createLogger('public-data-server');

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
 * public-data MCP server.
 * Tools will be registered here once the business scenario is defined.
 */
const publicRecordsSearchTool: McpTool = {
  name: 'public_records_search',
  description: 'Search public business registries and open data sources for company and ownership signals.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search target, company, or registry keyword.' },
      jurisdiction: { type: 'string', description: 'Optional region or country to constrain registry search.' },
      limit: { type: 'number', description: 'Maximum number of records to return.' },
    },
    required: ['query'],
  },
  async execute(input: unknown) {
    const payload = input as { query: string; jurisdiction?: string; limit?: number };
    return {
      success: true,
      query: payload.query,
      jurisdiction: payload.jurisdiction ?? null,
      limit: payload.limit ?? 50,
      records: [],
      source: 'public-data',
    };
  },
};

const registryLookupTool: McpTool = {
  name: 'registry_lookup',
  description: 'Look up a single company or legal entity in a public registry by name or identifier.',
  inputSchema: {
    type: 'object',
    properties: {
      company_name: { type: 'string', description: 'Company name to query.' },
      registry_id: { type: 'string', description: 'Optional registry or legal identifier.' },
    },
    required: ['company_name'],
  },
  async execute(input: unknown) {
    const payload = input as { company_name: string; registry_id?: string };
    return {
      success: true,
      company_name: payload.company_name,
      registry_id: payload.registry_id ?? null,
      entity: null,
      source: 'public-data',
    };
  },
};

export function createServer(): McpServer {
  const tools: McpTool[] = [publicRecordsSearchTool, registryLookupTool];

  return {
    name: 'public-data',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP public-data server ready', { tools: tools.map((t) => t.name) });
    },
  };
}

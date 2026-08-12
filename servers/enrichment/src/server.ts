import { createLogger } from '@mcp-toolkit/logging';

const logger = createLogger('enrichment-server');

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

const companyEnrichmentTool: McpTool = {
  name: 'enrich_company',
  description: 'Look up a company and return registration, firmographic, and ownership metadata.',
  inputSchema: {
    type: 'object',
    properties: {
      domain: { type: 'string', description: 'Company domain.' },
      company_name: { type: 'string', description: 'Company name if domain is unavailable.' },
    },
    required: ['domain'],
  },
  async execute(input: unknown) {
    const payload = input as { domain: string; company_name?: string };
    return {
      success: true,
      domain: payload.domain,
      company_name: payload.company_name ?? null,
      firmographics: {},
      source: 'enrichment',
    };
  },
};

const personEnrichmentTool: McpTool = {
  name: 'enrich_person',
  description: 'Enrich a person record with role, social profile, and contact metadata.',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Person name.' },
      company_domain: { type: 'string', description: 'Company domain to contextualize the person.' },
      email: { type: 'string', description: 'Email address when known.' },
    },
    required: ['name'],
  },
  async execute(input: unknown) {
    const payload = input as { name: string; company_domain?: string; email?: string };
    return {
      success: true,
      name: payload.name,
      company_domain: payload.company_domain ?? null,
      email: payload.email ?? null,
      profile: null,
      source: 'enrichment',
    };
  },
};

export function createServer(): McpServer {
  const tools: McpTool[] = [companyEnrichmentTool, personEnrichmentTool];

  return {
    name: 'enrichment',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP enrichment server ready', { tools: tools.map((t) => t.name) });
    },
  };
}

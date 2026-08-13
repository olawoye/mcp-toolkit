import { createLogger } from '@mcp-toolkit/logging';

const logger = createLogger('company-intelligence-server');

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
 * company-intelligence MCP server.
 * Tools will be registered here once the business scenario is defined.
 */
const leadScoringTool: McpTool = {
  name: 'lead_scoring',
  description: 'Score and rank leads using a simple placeholder model before more advanced models are added.',
  inputSchema: {
    type: 'object',
    properties: {
      leads: {
        type: 'array',
        description: 'Leads to score and rank.',
        items: {
          type: 'object',
          properties: {
            company_name: { type: 'string' },
            domain: { type: 'string' },
            score: { type: 'number' },
            buying_signals: { type: 'array', items: { type: 'string' } },
          },
          required: ['company_name'],
        },
      },
    },
    required: ['leads'],
  },
  async execute(input: unknown) {
    const payload = input as { leads?: Array<{ company_name?: string; domain?: string; score?: number; buying_signals?: string[] }> };
    const items = Array.isArray(payload.leads) ? payload.leads : [];

    return {
      success: true,
      scored_leads: items.map((lead, index) => ({
        rank: index + 1,
        company_name: lead.company_name ?? 'unknown',
        domain: lead.domain ?? null,
        score: typeof lead.score === 'number' ? lead.score : 0,
        buying_signals: lead.buying_signals ?? [],
        priority: index === 0 ? 'high' : index < 3 ? 'medium' : 'low',
      })),
      source: 'company-intelligence',
    };
  },
};

export function createServer(): McpServer {
  const tools: McpTool[] = [leadScoringTool];

  return {
    name: 'company-intelligence',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP company-intelligence server ready', { tools: tools.map((t) => t.name) });
    },
  };
}

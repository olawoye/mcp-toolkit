import { createLogger } from '@mcp-toolkit/logging';

const logger = createLogger('events-server');

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
 * events MCP server.
 * Tools will be registered here once the business scenario is defined.
 */
const eventsSearchTool: McpTool = {
  name: 'events_search',
  description: 'Search events and local ecosystems for communities, launch or meetup activity relevant to the target ICP.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Event, community, or ecosystem search term.' },
      location: { type: 'string', description: 'Optional city, region, or country.' },
      days: { type: 'number', description: 'Optional lookback window in days.' },
    },
    required: ['query'],
  },
  async execute(input: unknown) {
    const payload = input as { query: string; location?: string; days?: number };
    return {
      success: true,
      query: payload.query,
      location: payload.location ?? null,
      days: payload.days ?? 30,
      events: [],
      source: 'events',
    };
  },
};

const signalMonitoringTool: McpTool = {
  name: 'signal_monitoring',
  description: 'Monitor trigger signals such as hiring, funding, expand-cue, or launch activity related to target businesses.',
  inputSchema: {
    type: 'object',
    properties: {
      company_name: { type: 'string', description: 'Business or brand to monitor.' },
      trigger_types: { type: 'array', items: { type: 'string' }, description: 'Signal classes to watch.' },
    },
    required: ['company_name'],
  },
  async execute(input: unknown) {
    const payload = input as { company_name: string; trigger_types?: string[] };
    return {
      success: true,
      company_name: payload.company_name,
      trigger_types: payload.trigger_types ?? ['hiring', 'funding', 'launch', 'expansion'],
      signals: [],
      source: 'events',
    };
  },
};

export function createServer(): McpServer {
  const tools: McpTool[] = [eventsSearchTool, signalMonitoringTool];

  return {
    name: 'events',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP events server ready', { tools: tools.map((t) => t.name) });
    },
  };
}

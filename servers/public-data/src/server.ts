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
export function createServer(): McpServer {
  const tools: McpTool[] = [
    // TODO: register tools here
  ];

  return {
    name: 'public-data',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP public-data server ready', { tools: tools.map((t) => t.name) });
    },
  };
}

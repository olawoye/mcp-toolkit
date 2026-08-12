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
 * Business directory server — stub awaiting provider integrations (Yelp, Yellow Pages, etc.)
 */
export function createServer(): McpServer {
  const tools: McpTool[] = [];
  return {
    name: 'business-directories',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP Business Directories server ready', { tools: tools.map((t) => t.name) });
    },
  };
}

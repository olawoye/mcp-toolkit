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

export function createServer(): McpServer {
  const tools: McpTool[] = [];
  return {
    name: 'public-data',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP Public Data server ready', { tools: tools.map((t) => t.name) });
    },
  };
}

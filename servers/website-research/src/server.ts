import { createLogger } from '@mcp-toolkit/logging';

const logger = createLogger('website-research-server');

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
    name: 'website-research',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP Website Research server ready', { tools: tools.map((t) => t.name) });
    },
  };
}

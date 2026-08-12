import { createLogger } from '@mcp-toolkit/logging';

const logger = createLogger('technology-detection-server');

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
 * technology-detection MCP server.
 * Tools will be registered here once the business scenario is defined.
 */
export function createServer(): McpServer {
  const tools: McpTool[] = [
    // TODO: register tools here
  ];

  return {
    name: 'technology-detection',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP technology-detection server ready', { tools: tools.map((t) => t.name) });
    },
  };
}

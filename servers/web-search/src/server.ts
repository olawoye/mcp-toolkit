import { createLogger } from '@mcp-toolkit/logging';
import { searchTool } from './tools/search.js';
import { newsTool } from './tools/news.js';

const logger = createLogger('web-search-server');

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
  const tools: McpTool[] = [searchTool, newsTool];

  return {
    name: 'web-search',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP Web Search server ready', {
        tools: tools.map((t) => t.name),
      });
      // Wire to MCP transport (stdio/SSE) here when integrating with MCP SDK
    },
  };
}

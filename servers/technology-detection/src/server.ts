import { createLogger } from '@mcp-toolkit/logging';
import { detectTechTool } from './tools/detect.js';

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

export function createServer(): McpServer {
  const tools = [detectTechTool];
  return {
    name: 'technology-detection',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP Technology Detection server ready', { tools: tools.map((t) => t.name) });
    },
  };
}

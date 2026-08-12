import { createLogger } from '@mcp-toolkit/logging';
import { searchPlacesTool } from './tools/search_places.js';
import { placeDetailsTool } from './tools/place_details.js';
import { nearbySearchTool } from './tools/nearby_search.js';

const logger = createLogger('maps-server');

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
  const tools: McpTool[] = [searchPlacesTool, placeDetailsTool, nearbySearchTool];
  return {
    name: 'maps',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP Maps server ready', { tools: tools.map((t) => t.name) });
    },
  };
}

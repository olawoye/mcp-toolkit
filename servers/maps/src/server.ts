import { createLogger } from '@mcp-toolkit/logging';

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

const placeSearchTool: McpTool = {
  name: 'maps_search_places',
  description: 'Find businesses and places by text query and optional geography.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Text query for place search.' },
      location: { type: 'string', description: 'Optional city, region, or postal code.' },
      limit: { type: 'number', description: 'Maximum results to return.' },
    },
    required: ['query'],
  },
  async execute(input: unknown) {
    const payload = input as { query: string; location?: string; limit?: number };
    return {
      success: true,
      query: payload.query,
      location: payload.location ?? null,
      results: [],
      source: 'maps',
    };
  },
};

const nearbySearchTool: McpTool = {
  name: 'maps_nearby_search',
  description: 'Discover nearby businesses around a point or geocoded address.',
  inputSchema: {
    type: 'object',
    properties: {
      latitude: { type: 'number', description: 'Latitude of the search center.' },
      longitude: { type: 'number', description: 'Longitude of the search center.' },
      radius_meters: { type: 'number', description: 'Radius in meters.' },
      category: { type: 'string', description: 'Optional business category filter.' },
    },
    required: ['latitude', 'longitude'],
  },
  async execute(input: unknown) {
    const payload = input as { latitude: number; longitude: number; radius_meters?: number; category?: string };
    return {
      success: true,
      center: { latitude: payload.latitude, longitude: payload.longitude },
      radius_meters: payload.radius_meters ?? 5000,
      category: payload.category ?? null,
      businesses: [],
      source: 'maps',
    };
  },
};

export function createServer(): McpServer {
  const tools: McpTool[] = [placeSearchTool, nearbySearchTool];

  return {
    name: 'maps',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP maps server ready', { tools: tools.map((t) => t.name) });
    },
  };
}

import { googlePlacesSearch } from '@mcp-toolkit/provider-google';
import { requireString } from '@mcp-toolkit/validation';
import type { McpTool } from '../server.js';

export const nearbySearchTool: McpTool = {
  name: 'maps_nearby_search',
  description: 'Find businesses/places near a specific location.',
  inputSchema: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'lat,lng' },
      radius: { type: 'number', description: 'Radius in meters (default 1000)' },
      type: { type: 'string', description: 'Place type' },
      keyword: { type: 'string', description: 'Keyword filter' },
    },
    required: ['location'],
  },
  async execute(input: unknown) {
    const params = input as Record<string, unknown>;
    const location = requireString(params['location'], 'location');
    const keyword = (params['keyword'] as string | undefined) ?? '';
    const data = await googlePlacesSearch(keyword || 'place', {
      location,
      radius: (params['radius'] as number | undefined) ?? 1000,
      type: params['type'] as string | undefined,
    });
    return data.results;
  },
};

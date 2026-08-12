import { googlePlacesSearch } from '@mcp-toolkit/provider-google';
import { requireString } from '@mcp-toolkit/validation';
import type { McpTool } from '../server.js';

export const searchPlacesTool: McpTool = {
  name: 'maps_search_places',
  description: 'Search for businesses or places by text query using Google Places.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      location: { type: 'string', description: 'lat,lng center point' },
      radius: { type: 'number', description: 'Radius in meters' },
      type: { type: 'string', description: 'Place type filter' },
    },
    required: ['query'],
  },
  async execute(input: unknown) {
    const params = input as Record<string, unknown>;
    const query = requireString(params['query'], 'query');
    const data = await googlePlacesSearch(query, {
      location: params['location'] as string | undefined,
      radius: params['radius'] as number | undefined,
      type: params['type'] as string | undefined,
    });
    return data.results.map((r) => ({
      place_id: r.place_id,
      name: r.name,
      address: r.formatted_address,
      rating: r.rating,
      types: r.types,
      location: r.geometry?.location,
    }));
  },
};

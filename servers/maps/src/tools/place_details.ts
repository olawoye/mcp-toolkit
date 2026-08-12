import { googlePlaceDetails } from '@mcp-toolkit/provider-google';
import { requireString } from '@mcp-toolkit/validation';
import type { McpTool } from '../server.js';

export const placeDetailsTool: McpTool = {
  name: 'maps_place_details',
  description: 'Fetch detailed information about a specific place by its Google place_id.',
  inputSchema: {
    type: 'object',
    properties: {
      place_id: { type: 'string', description: 'Google Maps place ID' },
    },
    required: ['place_id'],
  },
  async execute(input: unknown) {
    const params = input as Record<string, unknown>;
    const placeId = requireString(params['place_id'], 'place_id');
    const data = await googlePlaceDetails(placeId);
    return data.result;
  },
};

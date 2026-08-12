import { httpGet } from '@mcp-toolkit/http';
import { buildUrl } from '@mcp-toolkit/utils';

const BASE = 'https://nominatim.openstreetmap.org';

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: Record<string, string>;
}

export async function nominatimSearch(
  query: string,
  options: { limit?: number; countrycodes?: string } = {},
): Promise<NominatimResult[]> {
  const url = buildUrl(`${BASE}/search`, {
    q: query,
    format: 'json',
    limit: options.limit ?? 5,
    ...(options.countrycodes && { countrycodes: options.countrycodes }),
  });
  const response = await httpGet<NominatimResult[]>(url, {
    headers: { 'User-Agent': 'mcp-toolkit/0.1.0 (contact@example.com)' },
  });
  return response.data;
}

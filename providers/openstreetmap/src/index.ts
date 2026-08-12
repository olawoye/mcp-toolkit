// Types for Nominatim (OpenStreetMap) geocoding API — implement when wiring to a tool.

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: Record<string, string>;
}

export interface NominatimSearchOptions {
  limit?: number;
  countrycodes?: string;
}

/**
 * Geocode / place search via Nominatim (no API key required).
 * Respect the Nominatim usage policy: max 1 req/s, set a descriptive User-Agent.
 */
export async function nominatimSearch(
  _query: string,
  _options?: NominatimSearchOptions,
): Promise<NominatimResult[]> {
  throw new Error('Not implemented — implement nominatim HTTP call');
}

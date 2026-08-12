import { requireApiKey } from '@mcp-toolkit/auth';
import { httpGet } from '@mcp-toolkit/http';
import { buildUrl } from '@mcp-toolkit/utils';

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: { location: { lat: number; lng: number } };
  rating?: number;
  types?: string[];
  business_status?: string;
  website?: string;
  formatted_phone_number?: string;
}

export interface PlacesSearchResponse {
  results: PlaceResult[];
  status: string;
  next_page_token?: string;
}

export async function googlePlacesSearch(
  query: string,
  options: { location?: string; radius?: number; type?: string } = {},
): Promise<PlacesSearchResponse> {
  const key = requireApiKey({ envVar: 'GOOGLE_MAPS_API_KEY', provider: 'Google Maps' });
  const url = buildUrl(`${PLACES_BASE}/textsearch/json`, {
    query,
    key,
    ...(options.location && { location: options.location }),
    ...(options.radius && { radius: options.radius }),
    ...(options.type && { type: options.type }),
  });
  const response = await httpGet<PlacesSearchResponse>(url);
  return response.data;
}

export async function googlePlaceDetails(placeId: string): Promise<{ result: PlaceResult; status: string }> {
  const key = requireApiKey({ envVar: 'GOOGLE_MAPS_API_KEY', provider: 'Google Maps' });
  const url = buildUrl(`${PLACES_BASE}/details/json`, {
    place_id: placeId,
    key,
    fields: 'place_id,name,formatted_address,geometry,rating,types,business_status,website,formatted_phone_number',
  });
  const response = await httpGet<{ result: PlaceResult; status: string }>(url);
  return response.data;
}

// Types for Google Places API — implement when wiring this provider to a tool.

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

export interface PlacesSearchOptions {
  location?: string;
  radius?: number;
  type?: string;
}

/**
 * Search for places via Google Places Text Search API.
 * Requires: GOOGLE_MAPS_API_KEY
 */
export async function googlePlacesSearch(
  _query: string,
  _options?: PlacesSearchOptions,
): Promise<PlacesSearchResponse> {
  throw new Error('Not implemented — wire GOOGLE_MAPS_API_KEY');
}

/**
 * Fetch place details by place_id from Google Places API.
 * Requires: GOOGLE_MAPS_API_KEY
 */
export async function googlePlaceDetails(
  _placeId: string,
): Promise<{ result: PlaceResult; status: string }> {
  throw new Error('Not implemented — wire GOOGLE_MAPS_API_KEY');
}

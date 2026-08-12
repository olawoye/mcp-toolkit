// Types for Google Custom Search API — implement when wiring this provider to a tool.

export interface GoogleSearchItem {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

export interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
  searchInformation?: {
    totalResults: string;
    searchTime: number;
  };
}

export interface GoogleSearchOptions {
  num?: number;
  start?: number;
}

/**
 * Search the web via Google Custom Search API.
 * Requires: GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_CX
 */
export async function googleSearch(
  _query: string,
  _options?: GoogleSearchOptions,
): Promise<GoogleSearchResponse> {
  throw new Error('Not implemented — wire GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_CX');
}

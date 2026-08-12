// Types for Bing Web Search API — implement when wiring this provider to a tool.

export interface BingWebPage {
  name: string;
  url: string;
  snippet: string;
  displayUrl: string;
}

export interface BingSearchResponse {
  webPages?: {
    totalEstimatedMatches: number;
    value: BingWebPage[];
  };
}

export interface BingSearchOptions {
  count?: number;
  offset?: number;
  market?: string;
}

/**
 * Search the web via Bing Web Search API.
 * Requires: BING_SEARCH_API_KEY
 */
export async function bingSearch(
  _query: string,
  _options?: BingSearchOptions,
): Promise<BingSearchResponse> {
  throw new Error('Not implemented — wire BING_SEARCH_API_KEY');
}

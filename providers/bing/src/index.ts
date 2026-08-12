import { requireApiKey } from '@mcp-toolkit/auth';
import { httpGet } from '@mcp-toolkit/http';
import { buildUrl } from '@mcp-toolkit/utils';

const BASE = 'https://api.bing.microsoft.com/v7.0/search';

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

export async function bingSearch(
  query: string,
  options: { count?: number; offset?: number; market?: string } = {},
): Promise<BingSearchResponse> {
  const key = requireApiKey({ envVar: 'BING_SEARCH_API_KEY', provider: 'Bing Search' });
  const url = buildUrl(BASE, {
    q: query,
    count: options.count ?? 10,
    offset: options.offset ?? 0,
    mkt: options.market ?? 'en-US',
  });
  const response = await httpGet<BingSearchResponse>(url, {
    headers: { 'Ocp-Apim-Subscription-Key': key },
  });
  return response.data;
}

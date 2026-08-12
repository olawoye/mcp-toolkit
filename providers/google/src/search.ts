import { requireApiKey } from '@mcp-toolkit/auth';
import { httpGet } from '@mcp-toolkit/http';
import { buildUrl } from '@mcp-toolkit/utils';

const BASE = 'https://www.googleapis.com/customsearch/v1';

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

export async function googleSearch(
  query: string,
  options: { num?: number; start?: number } = {},
): Promise<GoogleSearchResponse> {
  const key = requireApiKey({ envVar: 'GOOGLE_SEARCH_API_KEY', provider: 'Google Search' });
  const cx = requireApiKey({ envVar: 'GOOGLE_SEARCH_CX', provider: 'Google Custom Search Engine' });

  const url = buildUrl(BASE, {
    q: query,
    key,
    cx,
    num: options.num ?? 10,
    start: options.start ?? 1,
  });

  const response = await httpGet<GoogleSearchResponse>(url);
  return response.data;
}

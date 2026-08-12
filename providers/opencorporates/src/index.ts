import { optionalApiKey } from '@mcp-toolkit/auth';
import { httpGet } from '@mcp-toolkit/http';
import { buildUrl } from '@mcp-toolkit/utils';

const BASE = 'https://api.opencorporates.com/v0.4';

export interface OpenCorporatesCompany {
  name: string;
  company_number: string;
  jurisdiction_code: string;
  incorporation_date?: string;
  company_type?: string;
  current_status?: string;
  registered_address_in_full?: string;
}

export interface OpenCorporatesSearchResponse {
  results: {
    companies: Array<{ company: OpenCorporatesCompany }>;
    total_count: number;
    page: number;
    per_page: number;
  };
}

export async function openCorporatesSearch(
  query: string,
  options: { page?: number; per_page?: number; jurisdiction_code?: string } = {},
): Promise<OpenCorporatesSearchResponse> {
  const apiToken = optionalApiKey('OPENCORPORATES_API_KEY');
  const url = buildUrl(`${BASE}/companies/search`, {
    q: query,
    page: options.page ?? 1,
    per_page: options.per_page ?? 10,
    ...(options.jurisdiction_code && { jurisdiction_code: options.jurisdiction_code }),
    ...(apiToken && { api_token: apiToken }),
  });
  const response = await httpGet<OpenCorporatesSearchResponse>(url);
  return response.data;
}

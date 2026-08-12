// Types for OpenCorporates company registration API — implement when wiring to a tool.

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

export interface OpenCorporatesSearchOptions {
  page?: number;
  per_page?: number;
  jurisdiction_code?: string;
}

/**
 * Search for company registrations via OpenCorporates.
 * API key (OPENCORPORATES_API_KEY) is optional but increases rate limits.
 */
export async function openCorporatesSearch(
  _query: string,
  _options?: OpenCorporatesSearchOptions,
): Promise<OpenCorporatesSearchResponse> {
  throw new Error('Not implemented — implement OpenCorporates HTTP call');
}

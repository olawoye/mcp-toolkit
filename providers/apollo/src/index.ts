// Types for Apollo.io People & Organization API — implement when wiring to a tool.

export interface ApolloPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  linkedin_url?: string;
  title?: string;
  email?: string;
  organization_name?: string;
}

export interface ApolloOrganization {
  id: string;
  name: string;
  website_url?: string;
  linkedin_url?: string;
  estimated_num_employees?: number;
  industry?: string;
}

export interface ApolloPeopleSearchParams {
  q_organization_domains?: string[];
  person_titles?: string[];
  page?: number;
  per_page?: number;
}

export interface ApolloPeopleSearchResponse {
  people: ApolloPerson[];
  pagination: { total_entries: number; page: number; per_page: number };
}

/**
 * Search for people profiles via Apollo.io.
 * Requires: APOLLO_API_KEY
 */
export async function apolloPeopleSearch(
  _params: ApolloPeopleSearchParams,
): Promise<ApolloPeopleSearchResponse> {
  throw new Error('Not implemented — wire APOLLO_API_KEY');
}

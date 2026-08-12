import { requireApiKey } from '@mcp-toolkit/auth';
import { httpPost } from '@mcp-toolkit/http';

const BASE = 'https://api.apollo.io/v1';

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

export interface ApolloPeopleSearchResponse {
  people: ApolloPerson[];
  pagination: { total_entries: number; page: number; per_page: number };
}

export async function apolloPeopleSearch(params: {
  q_organization_domains?: string[];
  person_titles?: string[];
  page?: number;
  per_page?: number;
}): Promise<ApolloPeopleSearchResponse> {
  const key = requireApiKey({ envVar: 'APOLLO_API_KEY', provider: 'Apollo.io' });
  const response = await httpPost<ApolloPeopleSearchResponse>(
    `${BASE}/mixed_people/search`,
    params,
    { headers: { 'x-api-key': key } },
  );
  return response.data;
}

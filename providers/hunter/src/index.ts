import { requireApiKey } from '@mcp-toolkit/auth';
import { httpGet } from '@mcp-toolkit/http';
import { buildUrl } from '@mcp-toolkit/utils';

const BASE = 'https://api.hunter.io/v2';

export interface HunterEmail {
  value: string;
  type: string;
  confidence: number;
  first_name?: string;
  last_name?: string;
  position?: string;
}

export interface HunterDomainSearchResponse {
  data: {
    domain: string;
    organization?: string;
    emails: HunterEmail[];
  };
}

export async function hunterDomainSearch(domain: string): Promise<HunterDomainSearchResponse> {
  const key = requireApiKey({ envVar: 'HUNTER_API_KEY', provider: 'Hunter.io' });
  const url = buildUrl(`${BASE}/domain-search`, { domain, api_key: key });
  const response = await httpGet<HunterDomainSearchResponse>(url);
  return response.data;
}

export interface HunterVerifyResponse {
  data: {
    result: 'deliverable' | 'undeliverable' | 'risky' | 'unknown';
    score: number;
    email: string;
  };
}

export async function hunterVerifyEmail(email: string): Promise<HunterVerifyResponse> {
  const key = requireApiKey({ envVar: 'HUNTER_API_KEY', provider: 'Hunter.io' });
  const url = buildUrl(`${BASE}/email-verifier`, { email, api_key: key });
  const response = await httpGet<HunterVerifyResponse>(url);
  return response.data;
}

// Types for Hunter.io email discovery API — implement when wiring this provider to a tool.

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

export interface HunterVerifyResponse {
  data: {
    result: 'deliverable' | 'undeliverable' | 'risky' | 'unknown';
    score: number;
    email: string;
  };
}

/**
 * Find email addresses associated with a domain via Hunter.io.
 * Requires: HUNTER_API_KEY
 */
export async function hunterDomainSearch(
  _domain: string,
): Promise<HunterDomainSearchResponse> {
  throw new Error('Not implemented — wire HUNTER_API_KEY');
}

/**
 * Verify deliverability of an email address via Hunter.io.
 * Requires: HUNTER_API_KEY
 */
export async function hunterVerifyEmail(
  _email: string,
): Promise<HunterVerifyResponse> {
  throw new Error('Not implemented — wire HUNTER_API_KEY');
}

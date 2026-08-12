import { hunterDomainSearch, hunterVerifyEmail } from '@mcp-toolkit/provider-hunter';
import { requireString } from '@mcp-toolkit/validation';
import type { McpTool } from '../server.js';

export const enrichEmailTool: McpTool = {
  name: 'enrich_email',
  description: 'Find email addresses for a domain or verify an existing email address.',
  inputSchema: {
    type: 'object',
    properties: {
      domain: { type: 'string', description: 'Domain to search for emails' },
      email: { type: 'string', description: 'Email address to verify' },
    },
  },
  async execute(input: unknown) {
    const params = input as Record<string, unknown>;
    if (params['email']) {
      const email = requireString(params['email'], 'email');
      return hunterVerifyEmail(email);
    }
    if (params['domain']) {
      const domain = requireString(params['domain'], 'domain');
      return hunterDomainSearch(domain);
    }
    throw new Error('Provide either "domain" or "email"');
  },
};

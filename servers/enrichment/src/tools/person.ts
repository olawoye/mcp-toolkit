import { apolloPeopleSearch } from '@mcp-toolkit/provider-apollo';
import { requireString } from '@mcp-toolkit/validation';
import type { McpTool } from '../server.js';

export const enrichPersonTool: McpTool = {
  name: 'enrich_person',
  description: 'Find and enrich person profiles via Apollo.io.',
  inputSchema: {
    type: 'object',
    properties: {
      domain: { type: 'string', description: 'Company domain to search within' },
      titles: { type: 'array', items: { type: 'string' }, description: 'Job titles to filter by' },
    },
    required: ['domain'],
  },
  async execute(input: unknown) {
    const params = input as Record<string, unknown>;
    const domain = requireString(params['domain'], 'domain');
    const titles = (params['titles'] as string[] | undefined) ?? [];
    const data = await apolloPeopleSearch({
      q_organization_domains: [domain],
      person_titles: titles.length > 0 ? titles : undefined,
    });
    return data.people;
  },
};

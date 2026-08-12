import { openCorporatesSearch } from '@mcp-toolkit/provider-opencorporates';
import { requireString } from '@mcp-toolkit/validation';
import type { McpTool } from '../server.js';

export const enrichCompanyTool: McpTool = {
  name: 'enrich_company',
  description: 'Look up public company registration data from OpenCorporates.',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Company name' },
      jurisdiction_code: { type: 'string', description: 'Jurisdiction (e.g., us_de)' },
    },
    required: ['name'],
  },
  async execute(input: unknown) {
    const params = input as Record<string, unknown>;
    const name = requireString(params['name'], 'name');
    const data = await openCorporatesSearch(name, {
      jurisdiction_code: params['jurisdiction_code'] as string | undefined,
    });
    return data.results.companies.map((c) => c.company);
  },
};

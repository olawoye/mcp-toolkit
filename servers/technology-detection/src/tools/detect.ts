import { builtWithLookup } from '@mcp-toolkit/provider-builtwith';
import { requireString } from '@mcp-toolkit/validation';
import type { McpTool } from '../server.js';

export const detectTechTool: McpTool = {
  name: 'detect_technologies',
  description: 'Detect technologies used by a website domain via BuiltWith.',
  inputSchema: {
    type: 'object',
    properties: {
      domain: { type: 'string', description: 'Domain to analyse (e.g. example.com)' },
    },
    required: ['domain'],
  },
  async execute(input: unknown) {
    const params = input as Record<string, unknown>;
    const domain = requireString(params['domain'], 'domain');
    const data = await builtWithLookup(domain);
    const technologies = data.Results.flatMap((r) =>
      r.Result.Paths.flatMap((p) => p.Technologies),
    );
    return technologies.map((t) => ({ name: t.Name, tag: t.Tag }));
  },
};

import type { McpTool } from '../server.js';

export const enrichPhoneTool: McpTool = {
  name: 'enrich_phone',
  description: 'Basic phone number normalization and carrier lookup stub. Extend with a real carrier API.',
  inputSchema: {
    type: 'object',
    properties: {
      phone: { type: 'string', description: 'Phone number in E.164 or local format' },
    },
    required: ['phone'],
  },
  async execute(input: unknown) {
    const params = input as Record<string, unknown>;
    const phone = params['phone'] as string;
    // Stub: normalize to E.164-ish format
    const normalized = phone.replace(/[^\d+]/g, '');
    return { phone: normalized, normalized: true, carrier: null, type: null };
  },
};

import { createLogger } from '@mcp-toolkit/logging';

const logger = createLogger('crm-server');

export interface McpTool {
  name: string;
  description: string;
  inputSchema: object;
  execute(input: unknown): Promise<unknown>;
}

export interface McpServer {
  name: string;
  version: string;
  tools: McpTool[];
  start(): void;
}

export const requiredEnvironment = [
  'MT_CUSTOM_CRM_API_URL',
  'MT_CUSTOM_CRM_API_KEY',
  'MT_CUSTOM_CRM_TENANT_ID',
] as const;

export interface CrmServerConfig {
  baseUrl?: string;
  apiKey?: string;
  tenantId?: string;
}

const resolveConfig = (config?: Partial<CrmServerConfig>): Required<Pick<CrmServerConfig, 'baseUrl' | 'apiKey' | 'tenantId'>> => ({
  baseUrl: config?.baseUrl ?? process.env.SAAS_CRM_BASE_URL ?? 'https://crm.example.com',
  apiKey: config?.apiKey ?? process.env.SAAS_CRM_API_KEY ?? '',
  tenantId: config?.tenantId ?? process.env.SAAS_TENANT_ID ?? 'default',
});

async function callCustomCrm(config: ReturnType<typeof resolveConfig>, endpoint: string, body: Record<string, unknown>) {
  if (!config.apiKey) {
    throw new Error('SAAS_CRM_API_KEY is not configured. Provide it via environment or server config.');
  }

  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-api-key': config.apiKey,
      'x-tenant-id': config.tenantId,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CRM API call failed (${response.status}): ${text}`);
  }

  return response.json();
}

export function createServer(config?: Partial<CrmServerConfig>): McpServer {
  const resolved = resolveConfig(config);

  const createLeadTool: McpTool = {
    name: 'crm_create_lead',
    description: 'Create a lead in the SaaS CRM or application database.',
    inputSchema: {
      type: 'object',
      properties: {
        company_name: { type: 'string' },
        domain: { type: 'string' },
        email: { type: 'string' },
        score: { type: 'number' },
        source: { type: 'string' },
      },
      required: ['company_name'],
    },
    async execute(input: unknown) {
      const payload = input as Record<string, unknown>;
      const result = await callCustomCrm(resolved, '/api/leads', {
        tenantId: resolved.tenantId,
        company_name: payload.company_name,
        domain: payload.domain,
        email: payload.email,
        score: payload.score,
        source: payload.source ?? 'mcp-toolkit',
      });

      return {
        success: true,
        created: result,
        source: 'crm',
      };
    },
  };

  const updateLeadTool: McpTool = {
    name: 'crm_update_lead',
    description: 'Update an existing lead record in the SaaS CRM.',
    inputSchema: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        status: { type: 'string' },
        score: { type: 'number' },
      },
      required: ['leadId'],
    },
    async execute(input: unknown) {
      const payload = input as Record<string, unknown>;
      const result = await callCustomCrm(resolved, '/api/leads/update', {
        tenantId: resolved.tenantId,
        leadId: payload.leadId,
        status: payload.status,
        score: payload.score,
      });

      return {
        success: true,
        updated: result,
        source: 'crm',
      };
    },
  };

  const tools: McpTool[] = [createLeadTool, updateLeadTool];

  return {
    name: 'crm',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP crm server ready', { tools: tools.map((t) => t.name) });
    },
  };
}

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
  'MT_CUSTOM_CRM_AGENT_KEY',
] as const;

export interface CrmServerConfig {
  baseUrl?: string;
  apiKey?: string;
  tenantId?: string;
  agentKey?: string;
}

const resolveConfig = (config?: Partial<CrmServerConfig>): Required<Pick<CrmServerConfig, 'baseUrl' | 'apiKey' | 'tenantId' | 'agentKey'>> => ({
  baseUrl: config?.baseUrl ?? process.env.MT_CUSTOM_CRM_API_URL ?? 'http://localhost:3000',
  apiKey: config?.apiKey ?? process.env.MT_CUSTOM_CRM_API_KEY ?? '',
  tenantId: config?.tenantId ?? process.env.MT_CUSTOM_CRM_TENANT_ID ?? 'default',
  agentKey: config?.agentKey ?? process.env.MT_CUSTOM_CRM_AGENT_KEY ?? 'crm_campaign_lead_generation',
});

async function callCustomCrm(config: ReturnType<typeof resolveConfig>, endpoint: string, body: Record<string, unknown>) {
  if (!config.apiKey) {
    throw new Error('MT_CUSTOM_CRM_API_KEY is not configured. Provide it via environment or server config.');
  }

  const targetUrl = /^https?:\/\//i.test(endpoint)
    ? endpoint
    : new URL(endpoint, config.baseUrl).toString();

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-api-key': config.apiKey,
      'x-agent-key': config.agentKey,
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

  const upsertLeadTool: McpTool = {
    name: 'crm_upsert_lead',
    description: 'Upsert a lead in the SaaS CRM using the tenant-specific CRM integration endpoint.',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description: 'Raw JSON payload to send to the CRM endpoint.',
          additionalProperties: true,
        },
        endpoint: {
          type: 'string',
          description: 'Full or relative CRM endpoint, for example /api/integrations/crm/clients/upsert-by-email.',
        },
      },
      required: ['body', 'endpoint'],
    },
    async execute(input: unknown) {
      const payload = input as Record<string, unknown>;
      const body = payload.body as Record<string, unknown>;
      const endpoint = String(payload.endpoint ?? '/api/integrations/crm/clients/upsert-by-email');

      const result = await callCustomCrm(resolved, endpoint, body);

      return {
        success: true,
        upserted: result,
        source: 'crm',
        endpoint,
      };
    },
  };

  const tools: McpTool[] = [upsertLeadTool];

  return {
    name: 'crm',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP crm server ready', { tools: tools.map((t) => t.name) });
    },
  };
}

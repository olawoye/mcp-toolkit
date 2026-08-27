import { createLogger } from '@mcp-toolkit/logging';
import http from 'node:http';

const logger = createLogger('enrichment-server');

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
  'MT_PROVIDER_APOLLO_URL',
  'MT_PROVIDER_APOLLO_KEY',
] as const;

export interface EnrichmentServerConfig {
  provider?: 'apollo';
  apiKey?: string;
  baseUrl?: string;
}

const resolveConfig = (config?: Partial<EnrichmentServerConfig>): Required<Pick<EnrichmentServerConfig, 'provider' | 'apiKey' | 'baseUrl'>> => ({
  provider: config?.provider ?? 'apollo',
  apiKey: config?.apiKey ?? process.env.MT_PROVIDER_APOLLO_KEY ?? process.env.APOLLO_API_KEY ?? '',
  baseUrl: config?.baseUrl ?? process.env.MT_PROVIDER_APOLLO_URL ?? process.env.APOLLO_BASE_URL ?? 'https://api.apollo.io',
});

function buildApolloUrl(baseUrl: string, endpoint: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (normalizedBase.endsWith('/api/v1')) {
    return `${normalizedBase}${normalizedEndpoint}`;
  }

  if (normalizedBase.includes('/api/v1')) {
    return `${normalizedBase.replace(/\/api\/v1$/, '')}/api/v1${normalizedEndpoint}`;
  }

  return `${normalizedBase}/api/v1${normalizedEndpoint}`;
}

async function callApollo(config: ReturnType<typeof resolveConfig>, endpoint: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!config.apiKey) {
    throw new Error('APOLLO_API_KEY is not configured. Provide it via environment or server config.');
  }

  const response = await fetch(buildApolloUrl(config.baseUrl, endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-api-key': config.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apollo request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

export function createServer(config?: Partial<EnrichmentServerConfig>): McpServer {
  const resolved = resolveConfig(config);

  const companyEnrichmentTool: McpTool = {
    name: 'enrich_company',
    description: 'Look up a company and return registration, firmographic, and ownership metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Company domain.' },
        company_name: { type: 'string', description: 'Company name if domain is unavailable.' },
      },
      required: ['domain'],
    },
    async execute(input: unknown) {
      const payload = input as { domain?: string; company_name?: string };
      const domain = payload.domain?.trim();
      const companyName = payload.company_name?.trim();

      if (!domain && !companyName) {
        return {
          success: false,
          reason: 'not_enrichable',
          message: 'Company enrichment requires a company name or domain before invoking a paid provider lookup.',
          provider: resolved.provider,
          source: 'enrichment',
        };
      }

      const result = await callApollo(resolved, '/mixed_companies/search', {
        q_organization_domains_list: domain ? [domain] : [],
        q_organization_name: companyName ?? domain,
        page: 1,
        per_page: 5,
      });

      return {
        success: true,
        domain: domain ?? null,
        company_name: companyName ?? null,
        provider: resolved.provider,
        firmographics: result?.organization ?? result?.organizations ?? {},
        source: 'enrichment',
      };
    },
  };

  const personEnrichmentTool: McpTool = {
    name: 'enrich_person',
    description: 'Enrich a person record with role, social profile, and contact metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Person name.' },
        company_domain: { type: 'string', description: 'Company domain to contextualize the person.' },
        email: { type: 'string', description: 'Email address when known.' },
      },
      required: ['name'],
    },
    async execute(input: unknown) {
      const payload = input as { name?: string; company_domain?: string; email?: string };
      const personName = payload.name?.trim();
      const companyDomain = payload.company_domain?.trim();
      const email = payload.email?.trim();

      if (!personName && !companyDomain && !email) {
        return {
          success: false,
          reason: 'not_enrichable',
          message: 'Person enrichment requires a name, email, or company domain before invoking a paid provider lookup.',
          provider: resolved.provider,
          source: 'enrichment',
        };
      }

      const result = await callApollo(resolved, '/mixed_people/api_search', {
        q_organization_domains_list: companyDomain ? [companyDomain] : [],
        q_keywords: personName ?? email ?? companyDomain ?? '',
        contact_email_status: email ? ['verified'] : [],
        page: 1,
        per_page: 5,
      });

      return {
        success: true,
        name: personName ?? null,
        company_domain: companyDomain ?? null,
        email: email ?? null,
        provider: resolved.provider,
        profile: result?.person ?? result?.people ?? null,
        source: 'enrichment',
      };
    },
  };

  const tools: McpTool[] = [companyEnrichmentTool, personEnrichmentTool];

  return {
    name: 'enrichment',
    version: '0.1.0',
    tools,
    start() {
      const host = process.env.MCP_HOST ?? process.env.HOST ?? '127.0.0.1';
      const port = Number(process.env.MCP_PORT ?? process.env.PORT ?? 8157);

      const httpServer = http.createServer(async (req, res) => {
        const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);

        if (req.method === 'GET' && requestUrl.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, service: 'enrichment', tools: tools.map((t) => t.name) }));
          return;
        }

        if (req.method === 'GET' && requestUrl.pathname === '/') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ name: 'enrichment', version: '0.1.0', tools: tools.map((t) => t.name) }));
          return;
        }

        if (req.method === 'POST') {
          const toolName = requestUrl.pathname.replace(/^\/tools\//, '');
          const tool = tools.find((candidate) => candidate.name === toolName);

          if (!tool) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: `Unknown tool: ${toolName || requestUrl.pathname}` }));
            return;
          }

          let body: unknown;
          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid JSON body';
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: message }));
            return;
          }

          try {
            const result = await tool.execute(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, tool: tool.name, result }));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Tool execution failed';
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: message }));
          }
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Not found' }));
      });

      httpServer.listen(port, host, () => {
        logger.info('MCP enrichment HTTP server ready', {
          host,
          port,
          tools: tools.map((t) => t.name),
          provider: resolved.provider,
        });
      });
    },
  };
}

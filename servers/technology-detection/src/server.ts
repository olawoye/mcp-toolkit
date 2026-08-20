import { createLogger } from '@mcp-toolkit/logging';
import http from 'node:http';

const logger = createLogger('technology-detection-server');

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
  'MT_PROVIDER_BUILTWITH_URL',
  'MT_PROVIDER_BUILTWITH_KEY',
] as const;

export interface TechnologyDetectionConfig {
  provider?: 'builtwith';
  apiKey?: string;
  baseUrl?: string;
}

const resolveConfig = (config?: Partial<TechnologyDetectionConfig>): Required<Pick<TechnologyDetectionConfig, 'provider' | 'apiKey' | 'baseUrl'>> => ({
  provider: config?.provider ?? 'builtwith',
  apiKey: config?.apiKey ?? process.env.MT_PROVIDER_BUILTWITH_KEY ?? process.env.BUILTWITH_API_KEY ?? '',
  baseUrl: config?.baseUrl ?? process.env.MT_PROVIDER_BUILTWITH_URL ?? process.env.BUILTWITH_BASE_URL ?? 'https://api.builtwith.com',
});

async function callBuiltWith(config: ReturnType<typeof resolveConfig>, url: string): Promise<Record<string, unknown>> {
  if (!config.apiKey) {
    throw new Error('BUILTWITH_API_KEY is not configured. Provide it via environment or server config.');
  }

  const lookupUrl = new URL(`${config.baseUrl}/v20/api.json`);
  lookupUrl.searchParams.set('KEY', config.apiKey);
  lookupUrl.searchParams.set('LOOKUP', url);

  const response = await fetch(lookupUrl.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`BuiltWith lookup failed (${response.status}): ${body}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

export function createServer(config?: Partial<TechnologyDetectionConfig>): McpServer {
  const resolved = resolveConfig(config);

  const detectTechnologiesTool: McpTool = {
    name: 'detect_technologies',
    description: 'Inspect a website to identify technologies, stack components, and platform signals.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Website URL to inspect.' },
        max_depth: { type: 'number', description: 'Optional crawl depth limit.' },
      },
      required: ['url'],
    },
    async execute(input: unknown) {
      const payload = input as { url: string; max_depth?: number };
      const result = await callBuiltWith(resolved, payload.url);

      const technologies = Array.isArray(result.Results)
        ? (result.Results as Array<Record<string, unknown>>).flatMap((entry) => {
            const techs = Array.isArray(entry.technologies) ? entry.technologies : [];
            return techs.map((tech) => ({
              name: typeof tech === 'string' ? tech : (tech as Record<string, unknown>).name ?? null,
            }));
          })
        : [];

      return {
        success: true,
        url: payload.url,
        provider: resolved.provider,
        technologies,
        max_depth: payload.max_depth ?? 1,
        source: 'technology-detection',
      };
    },
  };

  const tools: McpTool[] = [detectTechnologiesTool];

  return {
    name: 'technology-detection',
    version: '0.1.0',
    tools,
    start() {
      const host = process.env.MCP_HOST ?? process.env.HOST ?? '127.0.0.1';
      const port = Number(process.env.MCP_PORT ?? process.env.PORT ?? 8158);

      const httpServer = http.createServer(async (req, res) => {
        const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);

        if (req.method === 'GET' && requestUrl.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, service: 'technology-detection', tools: tools.map((t) => t.name) }));
          return;
        }

        if (req.method === 'GET' && requestUrl.pathname === '/') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ name: 'technology-detection', version: '0.1.0', tools: tools.map((t) => t.name) }));
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
        logger.info('MCP technology-detection HTTP server ready', {
          host,
          port,
          tools: tools.map((t) => t.name),
          provider: resolved.provider,
        });
      });
    },
  };
}

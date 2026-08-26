import { createLogger } from '@mcp-toolkit/logging';
import http from 'node:http';

const logger = createLogger('public-data-server');

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

/**
 * public-data MCP server.
 * Tools will be registered here once the business scenario is defined.
 */
const publicRecordsSearchTool: McpTool = {
  name: 'public_records_search',
  description: 'Search public business registries and open data sources for company and ownership signals.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search target, company, or registry keyword.' },
      jurisdiction: { type: 'string', description: 'Optional region or country to constrain registry search.' },
      limit: { type: 'number', description: 'Maximum number of records to return.' },
    },
    required: ['query'],
  },
  async execute(input: unknown) {
    const payload = input as { query: string; jurisdiction?: string; limit?: number };
    return {
      success: true,
      query: payload.query,
      jurisdiction: payload.jurisdiction ?? null,
      limit: payload.limit ?? 50,
      records: [],
      source: 'public-data',
    };
  },
};

const registryLookupTool: McpTool = {
  name: 'registry_lookup',
  description: 'Look up a single company or legal entity in a public registry by name or identifier.',
  inputSchema: {
    type: 'object',
    properties: {
      company_name: { type: 'string', description: 'Company name to query.' },
      registry_id: { type: 'string', description: 'Optional registry or legal identifier.' },
    },
    required: ['company_name'],
  },
  async execute(input: unknown) {
    const payload = input as { company_name: string; registry_id?: string };
    return {
      success: true,
      company_name: payload.company_name,
      registry_id: payload.registry_id ?? null,
      entity: null,
      source: 'public-data',
    };
  },
};

export function createServer(): McpServer {
  const tools: McpTool[] = [publicRecordsSearchTool, registryLookupTool];

  return {
    name: 'public-data',
    version: '0.1.0',
    tools,
    start() {
      const host = process.env.MCP_HOST ?? process.env.HOST ?? '127.0.0.1';
      const port = Number(process.env.MCP_PORT ?? process.env.PORT ?? 8166);

      const httpServer = http.createServer(async (req, res) => {
        const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);

        if (req.method === 'GET' && requestUrl.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, service: 'public-data', tools: tools.map((t) => t.name) }));
          return;
        }

        if (req.method === 'GET' && requestUrl.pathname === '/') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ name: 'public-data', version: '0.1.0', tools: tools.map((t) => t.name) }));
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
        logger.info('MCP public-data HTTP server ready', {
          host,
          port,
          tools: tools.map((t) => t.name),
        });
      });
    },
  };
}

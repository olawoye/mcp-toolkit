import { createLogger } from '@mcp-toolkit/logging';
import http from 'node:http';

const logger = createLogger('website-research-server');

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
 * website-research MCP server.
 * Tools will be registered here once the business scenario is defined.
 */
const websiteTechnologyScanTool: McpTool = {
  name: 'website_technology_scan',
  description: 'Analyze a website or domain to detect stack, product, and technology indicators.',
  inputSchema: {
    type: 'object',
    properties: {
      domain: { type: 'string', description: 'Website domain to analyze.' },
      url: { type: 'string', description: 'Optional direct URL for deeper inspection.' },
    },
    required: ['domain'],
  },
  async execute(input: unknown) {
    const payload = input as { domain: string; url?: string };
    return {
      success: true,
      domain: payload.domain,
      url: payload.url ?? null,
      technologies: [],
      stack_signals: [],
      source: 'website-research',
    };
  },
};

const websiteContentResearchTool: McpTool = {
  name: 'website_content_research',
  description: 'Extract product positioning, service offerings, proof points, and CTA signals from a company website.',
  inputSchema: {
    type: 'object',
    properties: {
      domain: { type: 'string', description: 'Website domain to review.' },
      pages: { type: 'array', description: 'Optional page paths to prioritize.', items: { type: 'string' } },
    },
    required: ['domain'],
  },
  async execute(input: unknown) {
    const payload = input as { domain: string; pages?: string[] };
    return {
      success: true,
      domain: payload.domain,
      pages: payload.pages ?? [],
      signals: [],
      source: 'website-research',
    };
  },
};

export function createServer(): McpServer {
  const tools: McpTool[] = [websiteTechnologyScanTool, websiteContentResearchTool];

  return {
    name: 'website-research',
    version: '0.1.0',
    tools,
    start() {
      const host = process.env.MCP_HOST ?? process.env.HOST ?? '127.0.0.1';
      const port = Number(process.env.MCP_PORT ?? process.env.PORT ?? 8167);

      const httpServer = http.createServer(async (req, res) => {
        const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);

        if (req.method === 'GET' && requestUrl.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, service: 'website-research', tools: tools.map((t) => t.name) }));
          return;
        }

        if (req.method === 'GET' && requestUrl.pathname === '/') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ name: 'website-research', version: '0.1.0', tools: tools.map((t) => t.name) }));
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
        logger.info('MCP website-research HTTP server ready', {
          host,
          port,
          tools: tools.map((t) => t.name),
        });
      });
    },
  };
}

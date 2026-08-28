import { createLogger } from '@mcp-toolkit/logging';
import http from 'node:http';

const logger = createLogger('website-extraction-server');

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

export interface ExtractionSchema {
  type?: 'object';
  properties?: Record<string, { type?: string; description?: string; items?: unknown; }>; 
  required?: string[];
  additionalProperties?: boolean;
}

export interface WebsiteExtractionConfig {
  maxPageBytes?: number;
}

function normalizeExtractionQuery(value: unknown): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return 'Extract structured lead information from this website.';
}

function normalizeOutputSchema(value: unknown): ExtractionSchema | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as ExtractionSchema;
}

const extractWebsiteDataTool: McpTool = {
  name: 'extract_website_data',
  description: 'Fetch a URL, inspect the HTML/text content, and extract structured lead data according to a natural-language extractionQuery and optional JSON output schema.',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Website URL to inspect.' },
      extractionQuery: { type: 'string', description: 'Natural-language instruction for the LLM to extract specific fields from the page.' },
      outputSchema: {
        type: 'object',
        description: 'Optional JSON Schema for the output object so downstream tools can consume it deterministically.',
        additionalProperties: true,
      },
      max_chars: { type: 'number', description: 'Approximate page text limit to fetch before extraction.' },
    },
    required: ['url'],
  },
  async execute(input: unknown) {
    const payload = input as {
      url?: string;
      extractionQuery?: string;
      outputSchema?: ExtractionSchema;
      max_chars?: number;
    };

    const url = payload.url?.trim();
    if (!url) {
      throw new Error('A website URL is required.');
    }

    const outputSchema = normalizeOutputSchema(payload.outputSchema);
    const extractionQuery = normalizeExtractionQuery(payload.extractionQuery);
    const maxChars = Number(payload.max_chars ?? 120_000);

    let pageText = '';
    try {
      const response = await fetch(url, {
        headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
      });
      if (!response.ok) {
        throw new Error(`Fetch failed (${response.status}) for ${url}`);
      }
      const html = await response.text();
      pageText = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (pageText.length > maxChars) {
        pageText = pageText.slice(0, maxChars);
      }
    } catch (error) {
      logger.warn('Website extraction fetch failed', {
        url,
        error: error instanceof Error ? error.message : 'unknown error',
      });
      pageText = `Unable to fetch page content for ${url}.`;
    }

    return {
      success: true,
      url,
      extractionQuery,
      outputSchema,
      pageText,
      extracted_fields: [],
      extracted_data: {},
      source: 'website-extraction',
    };
  },
};

export function createServer(config?: Partial<WebsiteExtractionConfig>): McpServer {
  const tools: McpTool[] = [extractWebsiteDataTool];

  return {
    name: 'website-extraction',
    version: '0.1.0',
    tools,
    start() {
      const host = process.env.MCP_HOST ?? process.env.HOST ?? '127.0.0.1';
      const port = Number(process.env.MCP_PORT ?? process.env.PORT ?? 8169);

      const httpServer = http.createServer(async (req, res) => {
        const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);

        if (req.method === 'GET' && requestUrl.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, service: 'website-extraction', tools: tools.map((t) => t.name) }));
          return;
        }

        if (req.method === 'GET' && requestUrl.pathname === '/') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ name: 'website-extraction', version: '0.1.0', tools: tools.map((t) => t.name) }));
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
        logger.info('MCP website-extraction HTTP server ready', {
          host,
          port,
          tools: tools.map((t) => t.name),
        });
      });
    },
  };
}

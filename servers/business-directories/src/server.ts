import { createLogger } from '@mcp-toolkit/logging';
import http from 'node:http';
import { directorySources, getSourcesByScope, type DirectorySource, type EntityType, type Region } from './catalog';

const logger = createLogger('business-directories-server');

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

export const requiredEnvironment: string[] = [];

const countryCodeMap: Record<string, Region> = {
  us: 'north-america',
  ca: 'north-america',
  mx: 'north-america',
  gb: 'europe',
  de: 'europe',
  fr: 'europe',
  es: 'europe',
  it: 'europe',
  nl: 'europe',
  ie: 'europe',
  se: 'europe',
  no: 'europe',
  dk: 'europe',
  fi: 'europe',
  pl: 'europe',
  in: 'asia',
  sg: 'asia',
  jp: 'asia',
  kr: 'asia',
  au: 'oceania',
  nz: 'oceania',
  za: 'africa',
  br: 'south-america',
  ar: 'south-america',
  cl: 'south-america',
};

const validRegions: Region[] = ['north-america', 'south-america', 'europe', 'africa', 'asia', 'oceania'];

function parseRegionInput(raw?: string): Region | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (validRegions.includes(normalized as Region)) return normalized as Region;
  return countryCodeMap[normalized];
}

function normalizeRegionOrCountry(value?: string): { region?: Region; country?: string } {
  if (!value) return {};
  const normalized = value.trim().toLowerCase();
  const region = parseRegionInput(normalized);
  if (region) return { region, country: normalized };
  return { country: normalized };
}

const companyDirectorySearchTool: McpTool = {
  name: 'company_directory_search',
  description: 'Search business directories and local listings for companies or organizations matching a target ICP and geography.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query, company name, country, industry, or service term.' },
      location: { type: 'string', description: 'Optional city, state, region, or country code.' },
      region: { type: 'string', description: 'Optional continent or region name such as north-america or europe.' },
      country: { type: 'string', description: 'Optional ISO country code such as us, gb, de, in.' },
      entity_type: { type: 'string', description: 'Optional entity type: business or person.' },
      limit: { type: 'number', description: 'Maximum number of source candidates to return.' },
    },
    required: ['query'],
  },
  async execute(input: unknown) {
    const payload = input as {
      query: string;
      location?: string;
      region?: string;
      country?: string;
      entity_type?: string;
      limit?: number;
    };

    const typeFilter = payload.entity_type === 'person' ? 'person' : 'business';
    const filters = {
      entityType: typeFilter as EntityType,
      ...(payload.region ? { region: parseRegionInput(payload.region) } : {}),
      ...(payload.country ? { country: payload.country.toLowerCase() } : {}),
      limit: payload.limit ?? 10,
    };

    const matchedSources = getSourcesByScope(filters);

    return {
      success: true,
      query: payload.query,
      location: payload.location ?? null,
      region: payload.region ?? null,
      country: payload.country ?? null,
      entity_type: typeFilter,
      limit: payload.limit ?? 10,
      sources: matchedSources.map((source) => ({
        id: source.id,
        name: source.name,
        kind: source.kind,
        url: source.url ?? null,
        region: source.region,
        country: source.country,
        entity_types: source.entity_types,
        search_modes: source.search_modes,
        notes: source.notes ?? null,
      })),
      source: 'business-directories',
    };
  },
};

const personDirectorySearchTool: McpTool = {
  name: 'person_directory_search',
  description: 'Search professional and people directories for founders, executives, decision-makers, and contact individuals relevant to a business target.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Name, company, role, or individual search intent.' },
      company_name: { type: 'string', description: 'Optional company to anchor the person search.' },
      role: { type: 'string', description: 'Optional title such as founder, CEO, VP sales.' },
      location: { type: 'string', description: 'Optional city, region, or country.' },
      region: { type: 'string', description: 'Optional continent code like europe or north-america.' },
      country: { type: 'string', description: 'Optional country code such as us or uk.' },
      limit: { type: 'number', description: 'Maximum number of source candidates to return.' },
    },
    required: ['query'],
  },
  async execute(input: unknown) {
    const payload = input as {
      query: string;
      company_name?: string;
      role?: string;
      location?: string;
      region?: string;
      country?: string;
      limit?: number;
    };

    const scope = normalizeRegionOrCountry(payload.country ?? payload.region);
    const sources = getSourcesByScope({
      entityType: 'person',
      ...(scope.region ? { region: scope.region } : {}),
      ...(scope.country ? { country: scope.country } : {}),
      limit: payload.limit ?? 10,
    });

    return {
      success: true,
      query: payload.query,
      company_name: payload.company_name ?? null,
      role: payload.role ?? null,
      location: payload.location ?? null,
      region: payload.region ?? null,
      country: payload.country ?? null,
      limit: payload.limit ?? 10,
      sources: sources.map((source) => ({
        id: source.id,
        name: source.name,
        kind: source.kind,
        url: source.url ?? null,
        region: source.region,
        country: source.country,
        search_modes: source.search_modes,
        notes: source.notes ?? null,
      })),
      source: 'business-directories',
    };
  },
};

const businessListingLookupTool: McpTool = {
  name: 'business_listing_lookup',
  description: 'Resolve a specific business listing or company record from a directory dataset.',
  inputSchema: {
    type: 'object',
    properties: {
      company_name: { type: 'string', description: 'Company name to resolve.' },
      domain: { type: 'string', description: 'Optional company domain.' },
      country: { type: 'string', description: 'Optional country code or location.' },
      region: { type: 'string', description: 'Optional region or continent filter.' },
    },
    required: ['company_name'],
  },
  async execute(input: unknown) {
    const payload = input as { company_name: string; domain?: string; region?: string; country?: string };
    const candidates = getSourcesByScope({
      entityType: 'business',
      ...(payload.region ? { region: parseRegionInput(payload.region) } : {}),
      ...(payload.country ? { country: payload.country.toLowerCase() } : {}),
      limit: 10,
    });

    return {
      success: true,
      company_name: payload.company_name,
      domain: payload.domain ?? null,
      region: payload.region ?? null,
      country: payload.country ?? null,
      candidates: candidates.slice(0, 5).map((source) => ({
        id: source.id,
        name: source.name,
        kind: source.kind,
        region: source.region,
        country: source.country,
        url: source.url ?? null,
      })),
      listing: null,
      source: 'business-directories',
    };
  },
};

export function createServer(): McpServer {
  const tools: McpTool[] = [companyDirectorySearchTool, personDirectorySearchTool, businessListingLookupTool];

  return {
    name: 'business-directories',
    version: '0.1.0',
    tools,
    start() {
      const host = process.env.MCP_HOST ?? process.env.HOST ?? '127.0.0.1';
      const port = Number(process.env.MCP_PORT ?? process.env.PORT ?? 8165);

      const httpServer = http.createServer(async (req, res) => {
        const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);

        if (req.method === 'GET' && requestUrl.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, service: 'business-directories', tools: tools.map((t) => t.name), source_count: directorySources.length }));
          return;
        }

        if (req.method === 'GET' && requestUrl.pathname === '/') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ name: 'business-directories', version: '0.1.0', tools: tools.map((t) => t.name), source_count: directorySources.length }));
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
        logger.info('MCP business-directories HTTP server ready', {
          host,
          port,
          tools: tools.map((t) => t.name),
          source_count: directorySources.length,
        });
      });
    },
  };
}

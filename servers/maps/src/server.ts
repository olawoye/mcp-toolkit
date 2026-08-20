import { createLogger } from '@mcp-toolkit/logging';
import http from 'node:http';

const logger = createLogger('maps-server');

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
  'MT_PROVIDER_OSM_URL',
] as const;

export interface MapsServerConfig {
  provider?: 'openstreetmap';
  userAgent?: string;
}

const resolveConfig = (config?: Partial<MapsServerConfig>): Required<Pick<MapsServerConfig, 'provider' | 'userAgent'>> => ({
  provider: config?.provider ?? 'openstreetmap',
  userAgent: config?.userAgent ?? process.env.MT_PROVIDER_OSM_AGENT ?? process.env.OSM_USER_AGENT ?? 'olawoye-mcp-toolkit/0.1.0',
});

async function geocodeOsm(query: string, limit: number): Promise<Record<string, unknown>[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': resolveConfig().userAgent,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenStreetMap lookup failed (${response.status}): ${body}`);
  }

  return (await response.json()) as Record<string, unknown>[];
}

async function reverseGeocodeOsm(latitude: number, longitude: number): Promise<Record<string, unknown>> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': resolveConfig().userAgent,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenStreetMap reverse lookup failed (${response.status}): ${body}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

export function createServer(config?: Partial<MapsServerConfig>): McpServer {
  const resolved = resolveConfig(config);

  const placeSearchTool: McpTool = {
    name: 'maps_search_places',
    description: 'Find businesses and places by text query and optional geography.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text query for place search.' },
        location: { type: 'string', description: 'Optional city, region, or postal code.' },
        limit: { type: 'number', description: 'Maximum results to return.' },
      },
      required: ['query'],
    },
    async execute(input: unknown) {
      const payload = input as { query: string; location?: string; limit?: number };
      const query = payload.location ? `${payload.query} ${payload.location}` : payload.query;
      const results = await geocodeOsm(query, payload.limit ?? 10);

      return {
        success: true,
        query: payload.query,
        location: payload.location ?? null,
        provider: resolved.provider,
        results: results.map((result) => ({
          name: result.display_name ?? null,
          category: result.type ?? null,
          latitude: result.lat ? Number(result.lat) : null,
          longitude: result.lon ? Number(result.lon) : null,
          address: result.address ?? null,
        })),
        source: 'maps',
      };
    },
  };

  const nearbySearchTool: McpTool = {
    name: 'maps_nearby_search',
    description: 'Discover nearby businesses around a point or geocoded address.',
    inputSchema: {
      type: 'object',
      properties: {
        latitude: { type: 'number', description: 'Latitude of the search center.' },
        longitude: { type: 'number', description: 'Longitude of the search center.' },
        radius_meters: { type: 'number', description: 'Radius in meters.' },
        category: { type: 'string', description: 'Optional business category filter.' },
      },
      required: ['latitude', 'longitude'],
    },
    async execute(input: unknown) {
      const payload = input as { latitude: number; longitude: number; radius_meters?: number; category?: string };
      const result = await reverseGeocodeOsm(payload.latitude, payload.longitude);

      return {
        success: true,
        provider: resolved.provider,
        center: { latitude: payload.latitude, longitude: payload.longitude },
        radius_meters: payload.radius_meters ?? 5000,
        category: payload.category ?? null,
        location: result,
        source: 'maps',
      };
    },
  };

  const tools: McpTool[] = [placeSearchTool, nearbySearchTool];

  return {
    name: 'maps',
    version: '0.1.0',
    tools,
    start() {
      const host = process.env.MCP_HOST ?? process.env.HOST ?? '127.0.0.1';
      const port = Number(process.env.MCP_PORT ?? process.env.PORT ?? 8156);

      const httpServer = http.createServer(async (req, res) => {
        const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);

        if (req.method === 'GET' && requestUrl.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, service: 'maps', tools: tools.map((t) => t.name) }));
          return;
        }

        if (req.method === 'GET' && requestUrl.pathname === '/') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ name: 'maps', version: '0.1.0', tools: tools.map((t) => t.name) }));
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
        logger.info('MCP maps HTTP server ready', {
          host,
          port,
          tools: tools.map((t) => t.name),
          provider: resolved.provider,
        });
      });
    },
  };
}

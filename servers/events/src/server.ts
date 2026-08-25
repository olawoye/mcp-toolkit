import { createLogger } from '@mcp-toolkit/logging';
import http from 'node:http';

const logger = createLogger('events-server');

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

export const requiredEnvironment = ['MT_PROVIDER_EVENTBRITE_URL', 'MT_PROVIDER_EVENTBRITE_KEY'] as const;

export interface EventsServerConfig {
  provider?: 'eventbrite';
  apiKey?: string;
  baseUrl?: string;
}

const resolveConfig = (config?: Partial<EventsServerConfig>): Required<Pick<EventsServerConfig, 'provider' | 'apiKey' | 'baseUrl'>> => ({
  provider: config?.provider ?? 'eventbrite',
  apiKey: config?.apiKey ?? process.env.MT_PROVIDER_EVENTBRITE_KEY ?? process.env.EVENTBRITE_API_KEY ?? '',
  baseUrl: config?.baseUrl ?? process.env.MT_PROVIDER_EVENTBRITE_URL ?? process.env.EVENTBRITE_BASE_URL ?? 'https://www.eventbriteapi.com/v3',
});

async function callEventbrite(config: ReturnType<typeof resolveConfig>, params: Record<string, string | number | undefined>): Promise<Record<string, unknown>> {
  if (!config.apiKey) {
    throw new Error('MT_PROVIDER_EVENTBRITE_KEY is not configured. Provide it via environment or server config.');
  }

  const url = new URL(`${config.baseUrl}/events/search`);
  url.searchParams.set('token', config.apiKey);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Eventbrite lookup failed (${response.status}): ${body}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

const eventsSearchTool: McpTool = {
  name: 'events_search',
  description: 'Search Eventbrite for events and communities relevant to the target ICP.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Event, community, or ecosystem search term.' },
      location: { type: 'string', description: 'Optional city, region, or country.' },
      days: { type: 'number', description: 'Optional lookback window in days.' },
    },
    required: ['query'],
  },
  async execute(input: unknown) {
    const payload = input as { query: string; location?: string; days?: number };
    const now = new Date();
    const end = new Date(now.getTime() + (payload.days ?? 30) * 24 * 60 * 60 * 1000);

    const result = await callEventbrite(resolveConfig(), {
      q: payload.query,
      'location.address': payload.location,
      'start_date.range_start': now.toISOString(),
      'start_date.range_end': end.toISOString(),
      sort_by: 'date',
      page: 1,
    });

    const events = Array.isArray(result.events)
      ? result.events.map((entry) => {
          const event = entry as Record<string, unknown>;
          return {
            id: event.id ?? null,
            name: typeof event.name === 'object' ? (event.name as Record<string, unknown>).text ?? null : null,
            url: event.url ?? null,
            start: event.start ?? null,
            end: event.end ?? null,
            venue: event.venue ?? null,
            status: event.status ?? null,
          };
        })
      : [];

    return {
      success: true,
      query: payload.query,
      location: payload.location ?? null,
      days: payload.days ?? 30,
      events,
      provider: 'eventbrite',
      source: 'events',
    };
  },
};

const signalMonitoringTool: McpTool = {
  name: 'signal_monitoring',
  description: 'Monitor Eventbrite activity such as launches, communities, and ecosystem triggers related to target businesses.',
  inputSchema: {
    type: 'object',
    properties: {
      company_name: { type: 'string', description: 'Business or brand to monitor.' },
      trigger_types: { type: 'array', items: { type: 'string' }, description: 'Signal classes to watch.' },
    },
    required: ['company_name'],
  },
  async execute(input: unknown) {
    const payload = input as { company_name: string; trigger_types?: string[] };
    const result = await callEventbrite(resolveConfig(), {
      q: payload.company_name,
      page: 1,
      sort_by: 'date',
    });

    const signals = Array.isArray(result.events)
      ? result.events.map((entry) => {
          const event = entry as Record<string, unknown>;
          return {
            company_name: payload.company_name,
            title: typeof event.name === 'object' ? (event.name as Record<string, unknown>).text ?? payload.company_name : payload.company_name,
            url: event.url ?? null,
            trigger_type: (payload.trigger_types ?? ['launch', 'community', 'expansion'])[0] ?? 'launch',
          };
        })
      : [];

    return {
      success: true,
      company_name: payload.company_name,
      trigger_types: payload.trigger_types ?? ['hiring', 'funding', 'launch', 'expansion'],
      signals,
      source: 'events',
      provider: 'eventbrite',
    };
  },
};

export function createServer(config?: Partial<EventsServerConfig>): McpServer {
  const resolved = resolveConfig(config);
  const tools: McpTool[] = [eventsSearchTool, signalMonitoringTool];

  return {
    name: 'events',
    version: '0.1.0',
    tools,
    start() {
      const host = process.env.MCP_HOST ?? process.env.HOST ?? '127.0.0.1';
      const port = Number(process.env.MCP_PORT ?? process.env.PORT ?? 8159);

      const httpServer = http.createServer(async (req, res) => {
        const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);

        if (req.method === 'GET' && requestUrl.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, service: 'events', tools: tools.map((t) => t.name), provider: resolved.provider }));
          return;
        }

        if (req.method === 'GET' && requestUrl.pathname === '/') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ name: 'events', version: '0.1.0', tools: tools.map((t) => t.name), provider: resolved.provider }));
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
        logger.info('MCP events HTTP server ready', {
          host,
          port,
          tools: tools.map((t) => t.name),
          provider: resolved.provider,
        });
      });
    },
  };
}
